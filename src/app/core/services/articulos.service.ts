import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import type { Articulo, EstadoPublicacion } from '../models';

const SELECT_CON_CATEGORIA =
  '*, categorias:categoria_id (id, nombre, slug)';

@Injectable({ providedIn: 'root' })
export class ArticulosService {
  private readonly sb = inject(SupabaseService).client;

  /** Panel: todos los artículos, filtro opcional por estado. */
  async listarAdmin(estado?: EstadoPublicacion | ''): Promise<Articulo[]> {
    let q = this.sb
      .from('articulos')
      .select(SELECT_CON_CATEGORIA)
      .order('updated_at', { ascending: false });
    if (estado) q = q.eq('estado', estado);
    const { data, error } = await q;
    if (error) throw error;
    return data as unknown as Articulo[];
  }

  async obtener(id: string): Promise<Articulo> {
    const { data, error } = await this.sb
      .from('articulos')
      .select(SELECT_CON_CATEGORIA)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as Articulo;
  }

  /** Público: solo publicados, filtro opcional por categoría (slug). */
  async listarPublicos(categoriaSlug?: string): Promise<Articulo[]> {
    const { data, error } = await this.sb
      .from('articulos')
      .select(SELECT_CON_CATEGORIA)
      .eq('estado', 'publicado')
      .order('fecha_publicacion', { ascending: false });
    if (error) throw error;
    let arts = data as unknown as Articulo[];
    if (categoriaSlug) {
      arts = arts.filter((a) => a.categorias?.slug === categoriaSlug);
    }
    return arts;
  }

  async obtenerPublicoPorSlug(slug: string): Promise<Articulo | null> {
    const { data, error } = await this.sb
      .from('articulos')
      .select(SELECT_CON_CATEGORIA)
      .eq('slug', slug)
      .eq('estado', 'publicado')
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Articulo) ?? null;
  }

  async crear(art: Partial<Articulo>): Promise<Articulo> {
    const { data, error } = await this.sb
      .from('articulos')
      .insert(this.normalizar(art))
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Articulo;
  }

  async actualizar(id: string, art: Partial<Articulo>): Promise<void> {
    const { error } = await this.sb
      .from('articulos')
      .update({ ...this.normalizar(art), updated_at: new Date().toISOString() })
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
    const { error } = await this.sb.from('articulos').update(patch).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb.from('articulos').delete().eq('id', id);
    if (error) throw error;
  }

  /** Aplica las reglas del CHECK de autor y limpia el join. */
  private normalizar(art: Partial<Articulo>): Record<string, unknown> {
    const { categorias: _omit, id: _id, ...resto } = art as Record<string, unknown>;
    const copia = { ...resto } as Record<string, unknown>;
    if (copia['autor_tipo'] === 'libre') copia['autor_uid'] = null;
    if (copia['autor_tipo'] === 'usuario') copia['autor_texto'] = null;
    return copia;
  }
}
