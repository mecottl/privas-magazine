import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import type { EdicionRevista, EstadoPublicacion } from '../models';
import { conCacheTTL } from './cache-ttl';

@Injectable({ providedIn: 'root' })
export class EdicionesService {
  private readonly sb = inject(SupabaseService).client;
  private readonly cache = conCacheTTL<EdicionRevista[]>(60_000);

  /** Panel: todas las ediciones (sin las de la papelera). */
  async listarAdmin(): Promise<EdicionRevista[]> {
    const { data, error } = await this.sb
      .from('ediciones_revista')
      .select('*')
      .is('eliminado_en', null)
      .order('anio', { ascending: false });
    if (error) throw error;
    return data as EdicionRevista[];
  }

  /** Panel: solo las de la papelera (issue #77). */
  async listarPapelera(): Promise<EdicionRevista[]> {
    const { data, error } = await this.sb
      .from('ediciones_revista')
      .select('*')
      .not('eliminado_en', 'is', null)
      .order('eliminado_en', { ascending: false });
    if (error) throw error;
    return data as EdicionRevista[];
  }

  async obtener(id: string): Promise<EdicionRevista> {
    const { data, error } = await this.sb
      .from('ediciones_revista')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as EdicionRevista;
  }

  async listarPublicas(): Promise<EdicionRevista[]> {
    return this.cache('publicas', async () => {
      const { data, error } = await this.sb
        .from('ediciones_revista')
        .select('*')
        .eq('estado', 'publicado')
        .order('anio', { ascending: false });
      if (error) throw error;
      return data as EdicionRevista[];
    });
  }

  async crear(ed: Partial<EdicionRevista>): Promise<EdicionRevista> {
    const { data, error } = await this.sb
      .from('ediciones_revista')
      .insert(this.limpiar(ed))
      .select()
      .single();
    if (error) throw error;
    return data as EdicionRevista;
  }

  async actualizar(id: string, ed: Partial<EdicionRevista>): Promise<void> {
    const { error } = await this.sb
      .from('ediciones_revista')
      .update({ ...this.limpiar(ed), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async cambiarEstado(
    id: string,
    estado: EstadoPublicacion,
    fecha_publicacion?: string | null,
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      estado,
      updated_at: new Date().toISOString(),
    };
    if (estado === 'publicado') {
      patch['fecha_publicacion'] = fecha_publicacion ?? new Date().toISOString();
    }
    if (estado === 'programado' && fecha_publicacion) {
      patch['fecha_publicacion'] = fecha_publicacion;
    }
    const { error } = await this.sb
      .from('ediciones_revista')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  /** Mueve a la papelera (issue #77) — no borra la fila. */
  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb
      .from('ediciones_revista')
      .update({ eliminado_en: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async restaurar(id: string): Promise<void> {
    const { error } = await this.sb
      .from('ediciones_revista')
      .update({ eliminado_en: null })
      .eq('id', id);
    if (error) throw error;
  }

  /** Borrado real, sin vuelta atrás — solo desde la papelera. */
  async eliminarDefinitivo(id: string): Promise<void> {
    const { error } = await this.sb
      .from('ediciones_revista')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  private limpiar(ed: Partial<EdicionRevista>): Record<string, unknown> {
    const { id: _id, created_at: _c, updated_at: _u, ...resto } =
      ed as Record<string, unknown>;
    return resto;
  }
}
