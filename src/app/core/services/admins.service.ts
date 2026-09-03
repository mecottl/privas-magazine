import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import type { NivelPermiso, PerfilAdmin } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminsService {
  private readonly supabase = inject(SupabaseService);
  private get sb() {
    return this.supabase.client;
  }

  async listar(): Promise<PerfilAdmin[]> {
    const { data, error } = await this.sb
      .from('perfiles_admin')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as PerfilAdmin[];
  }

  /** Llama a la Edge Function `invitar-admin` (única vía de alta). */
  async invitar(payload: {
    email: string;
    nombre_visible: string;
    nivel_permiso: NivelPermiso;
  }): Promise<{ ok: boolean; admin?: unknown; error?: string }> {
    const { data, error } = await this.supabase.invokeFunction<{
      ok: boolean;
      admin?: unknown;
      error?: string;
    }>('invitar-admin', payload);
    if (error) {
      // El cuerpo de error de la función suele traer { error: "..." }.
      const detalle = (data as { error?: string } | null)?.error;
      return { ok: false, error: detalle ?? error.message };
    }
    return data ?? { ok: false, error: 'Sin respuesta' };
  }

  /**
   * Activa/desactiva OTRO admin vía la Edge Function `set-admin-activo`.
   * No se puede hacer con un UPDATE directo: la RLS de `perfiles_admin` solo
   * permite `id = auth.uid()`, y además hay que impedir auto-desactivarse.
   */
  async cambiarActivo(id: string, activo: boolean): Promise<void> {
    const { data, error } = await this.supabase.invokeFunction<{
      ok?: boolean;
      error?: string;
    }>('set-admin-activo', { id, activo });
    if (error) {
      const detalle = (data as { error?: string } | null)?.error;
      throw new Error(detalle ?? error.message);
    }
  }
}
