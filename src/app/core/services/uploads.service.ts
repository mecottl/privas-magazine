import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';

export type TipoArchivo =
  | 'articulo-portada'
  | 'revista-pdf'
  | 'revista-portada';

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Sube un archivo vía la Edge Function `subir-archivo` (valida admin, tipo,
   * MIME y tamaño) y devuelve la URL final para guardar en la fila.
   */
  async subir(archivo: File, tipo: TipoArchivo): Promise<string> {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('tipo', tipo);

    const { data, error } = await this.supabase.invokeFunction<{
      ok?: boolean;
      url?: string;
      error?: string;
    }>('subir-archivo', form);

    if (error) {
      const detalle = (data as { error?: string } | null)?.error;
      throw new Error(detalle ?? error.message);
    }
    if (!data?.url) throw new Error('La función no devolvió una URL');
    return data.url;
  }
}
