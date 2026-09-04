import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';

export type TipoArchivo =
  | 'articulo-portada'
  | 'revista-pdf'
  | 'revista-portada';

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

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Sube un archivo vía la Edge Function `subir-archivo` (valida admin, tipo,
   * MIME y tamaño) y devuelve { url, path, target } para guardar en la fila.
   */
  async subir(archivo: File, tipo: TipoArchivo): Promise<ArchivoSubido> {
    const form = new FormData();
    form.append('archivo', archivo);
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
      throw new Error(detalle ?? error.message);
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
