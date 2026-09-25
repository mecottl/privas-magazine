import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';

export type TipoArchivo =
  | 'articulo-portada'
  | 'revista-pdf'
  | 'revista-portada'
  | 'marca-logo';

export type DestinoArchivo = 'supabase' | 'ftp';

/**
 * Resultado de subir un archivo. Se guardan los 3 valores juntos en la fila:
 *   url    → para MOSTRAR el archivo.
 *   path   → ruta interna, necesaria para BORRARLO luego (limpieza de huérfanos).
 *   target → destino real de esta subida ('supabase' | 'ftp').
 */
export interface ArchivoSubido {
  url: string;
  path: string;
  target: DestinoArchivo;
}

/** Lado mayor máximo de un logo: se muestran a ~100 px, 1024 sobra incluso en pantallas retina. */
const LOGO_MAX_PX = 1024;

/**
 * Reduce un logo enorme (p. ej. 6250×6250, 2.1 MB, exportado de Canva) antes
 * de subirlo: pesa menos, no pasa el tope de 2 MB y sube sin fallar en
 * celular. `createImageBitmap` con resize decodifica ya reducido (no carga los
 * 39 MP en memoria). Conserva la transparencia (PNG). Si algo falla, se sube
 * el original tal cual.
 */
async function reducirLogo(archivo: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(archivo);
    const lado = Math.max(bmp.width, bmp.height);
    bmp.close();
    if (lado <= LOGO_MAX_PX && archivo.size <= 1.5 * 1024 * 1024) return archivo;

    const esc = Math.min(1, LOGO_MAX_PX / lado);
    const ancho = Math.round(bmp.width * esc);
    const alto = Math.round(bmp.height * esc);
    const chico = await createImageBitmap(archivo, {
      resizeWidth: ancho,
      resizeHeight: alto,
      resizeQuality: 'high',
    });
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext('2d')!.drawImage(chico, 0, 0);
    chico.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, '') + '.png', { type: 'image/png' });
  } catch {
    return archivo;
  }
}

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Sube un archivo vía la Edge Function `subir-archivo` (valida admin, tipo,
   * MIME y tamaño) y devuelve { url, path, target } para guardar en la fila.
   */
  async subir(archivo: File, tipo: TipoArchivo): Promise<ArchivoSubido> {
    // Se lee el archivo completo ANTES de enviarlo: en celulares, un archivo
    // que vive en la nube (Fotos, iCloud, Drive) y aún no se descargó falla a
    // media subida y el servidor recibe un cuerpo cortado ("Unable to parse
    // body as form data"). Así el error sale aquí, claro, y no en el servidor.
    if (tipo === 'marca-logo') archivo = await reducirLogo(archivo);
    let bytes: ArrayBuffer;
    try {
      bytes = await archivo.arrayBuffer();
    } catch {
      throw new Error(
        'No se pudo leer el archivo. Si está en la nube, descárgalo al dispositivo e inténtalo de nuevo.',
      );
    }
    const form = new FormData();
    form.append('archivo', new File([bytes], archivo.name, { type: archivo.type }));
    form.append('tipo', tipo);

    const { data, error } = await this.supabase.invokeFunction<{
      ok?: boolean;
      url?: string;
      ruta?: string;
      target?: string;
      error?: string;
    }>('subir-archivo', form);

    if (error) {
      const detalle = (data as { error?: string } | null)?.error;
      const msg = detalle ?? error.message;
      throw new Error(
        /form data/i.test(msg)
          ? 'El archivo no llegó completo. Inténtalo de nuevo; si sigue fallando, prueba con una imagen más liviana.'
          : msg,
      );
    }
    if (!data?.url || !data?.ruta) {
      throw new Error('La función no devolvió la URL y la ruta del archivo');
    }
    return {
      url: data.url,
      path: data.ruta,
      target: data.target === 'ftp' ? 'ftp' : 'supabase',
    };
  }
}
