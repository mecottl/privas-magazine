import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import type { EnlaceMarca, Marca } from '../models';

@Injectable({ providedIn: 'root' })
export class MarcasService {
  private readonly sb = inject(SupabaseService).client;

  async listar(): Promise<Marca[]> {
    const { data, error } = await this.sb
      .from('marcas')
      .select('*')
      .order('orden');
    if (error) throw error;
    return (data as Marca[]).map((m) => this.normalizarFila(m));
  }

  async crear(m: Partial<Marca>): Promise<Marca> {
    const { data, error } = await this.sb
      .from('marcas')
      .insert(this.payload(m))
      .select()
      .single();
    if (error) throw error;
    return this.normalizarFila(data as Marca);
  }

  async actualizar(id: string, m: Partial<Marca>): Promise<void> {
    const { error } = await this.sb
      .from('marcas')
      .update(this.payload(m))
      .eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb.from('marcas').delete().eq('id', id);
    if (error) throw error;
  }

  /** Deja solo columnas reales y enlaces limpios (sin filas vacías). */
  private payload(m: Partial<Marca>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (m.nombre !== undefined) out['nombre'] = m.nombre?.trim();
    if (m.descripcion !== undefined) out['descripcion'] = m.descripcion?.trim() || null;
    if (m.sitio_web_url !== undefined) out['sitio_web_url'] = m.sitio_web_url?.trim() || null;
    if (m.logo_url !== undefined) out['logo_url'] = m.logo_url?.trim() || null;
    if (m.orden !== undefined) out['orden'] = m.orden ?? 0;
    if (m.enlaces !== undefined) out['enlaces'] = this.limpiarEnlaces(m.enlaces);
    return out;
  }

  private limpiarEnlaces(enlaces: EnlaceMarca[] | undefined): EnlaceMarca[] {
    return (enlaces ?? [])
      .map((e) => ({ tipo: (e.tipo ?? 'otro').trim(), url: (e.url ?? '').trim() }))
      .filter((e) => e.url.length > 0);
  }

  /** `enlaces` siempre array; migra `red_social_url` sola a un enlace si hace falta. */
  private normalizarFila(m: Marca): Marca {
    const enlaces = Array.isArray(m.enlaces) ? m.enlaces : [];
    if (!enlaces.length && m.red_social_url) {
      enlaces.push({ tipo: 'otro', url: m.red_social_url });
    }
    return { ...m, enlaces };
  }
}
