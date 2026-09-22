import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import { mismoSlug, type Articulo, type EstadoPublicacion } from '../models';
import { conCacheTTL } from './cache-ttl';

/**
 * Embebe las categorías por el join M2M nombrando explícitamente la tabla
 * puente `articulos_categorias`. El hint explícito evita el error intermitente
 * PGRST201 ("more than one relationship was found") cuando el caché de esquema
 * de PostgREST resuelve la relación de forma ambigua.
 */
const SELECT_CON_CATEGORIAS =
  '*, categorias:categorias!articulos_categorias(id, nombre, slug)';

@Injectable({ providedIn: 'root' })
export class ArticulosService {
  private readonly supabase = inject(SupabaseService);
  private readonly sb = this.supabase.client;
  /** 60s: navegar entre / → /articulos → /revistas no repite la consulta. */
  private readonly cache = conCacheTTL<Articulo[]>(60_000);

  /** Panel: todos los artículos, filtro opcional por estado. */
  async listarAdmin(estado?: EstadoPublicacion | ''): Promise<Articulo[]> {
    let q = this.sb
      .from('articulos')
      .select(SELECT_CON_CATEGORIAS)
      .order('updated_at', { ascending: false });
    if (estado) q = q.eq('estado', estado);
    const { data, error } = await q;
    if (error) throw error;
    return data as unknown as Articulo[];
  }

  async obtener(id: string): Promise<Articulo> {
    const { data, error } = await this.sb
      .from('articulos')
      .select(SELECT_CON_CATEGORIAS)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as Articulo;
  }

  /** Público: solo publicados, filtro opcional por categoría (slug). */
  async listarPublicos(categoriaSlug?: string): Promise<Articulo[]> {
    // Un solo cache para "todos los publicados" — el filtro por categoría
    // se aplica en memoria abajo, igual que antes, así una sola entrada de
    // cache sirve para todas las categorías.
    const todos = await this.cache('publicos', async () => {
      const { data, error } = await this.sb
        .from('articulos')
        .select(SELECT_CON_CATEGORIAS)
        .eq('estado', 'publicado')
        // Más recientes primero; los que no tienen fecha van al final, no arriba.
        .order('fecha_publicacion', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Articulo[];
    });
    let arts = todos;
    if (categoriaSlug) {
      arts = arts.filter((a) =>
        (a.categorias ?? []).some((c) => mismoSlug(c.slug, categoriaSlug)),
      );
    }
    return arts;
  }

  /** Público, vía token de vista previa (issue #75) — cualquier estado. */
  async obtenerPorTokenPreview(token: string): Promise<Articulo> {
    const { data, error } = await this.supabase.invokeFunction<{
      articulo?: Articulo;
      error?: string;
    }>('obtener-articulo-preview', { token });
    if (error || !data?.articulo) {
      throw new Error(data?.error ?? error?.message ?? 'No se pudo cargar la vista previa.');
    }
    return data.articulo;
  }

  async obtenerPublicoPorSlug(slug: string): Promise<Articulo | null> {
    const { data, error } = await this.sb
      .from('articulos')
      .select(SELECT_CON_CATEGORIAS)
      .eq('slug', slug)
      .eq('estado', 'publicado')
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Articulo) ?? null;
  }

  async crear(art: Partial<Articulo>, categoriaIds: string[] = []): Promise<Articulo> {
    const { data, error } = await this.sb
      .from('articulos')
      .insert(this.normalizar(art))
      .select('id')
      .single();
    if (error) throw error;
    const creado = data as unknown as Articulo;
    await this.sincronizarCategorias(creado.id, categoriaIds);
    return creado;
  }

  async actualizar(
    id: string,
    art: Partial<Articulo>,
    categoriaIds?: string[],
  ): Promise<void> {
    const { error } = await this.sb
      .from('articulos')
      .update({
        ...this.normalizar(art),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    if (categoriaIds) await this.sincronizarCategorias(id, categoriaIds);
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

  /** Reescribe el conjunto de categorías del artículo (borra + inserta). */
  private async sincronizarCategorias(
    articuloId: string,
    categoriaIds: string[],
  ): Promise<void> {
    const { error: errDel } = await this.sb
      .from('articulos_categorias')
      .delete()
      .eq('articulo_id', articuloId);
    if (errDel) throw errDel;

    const unicas = [...new Set(categoriaIds)];
    if (!unicas.length) return;
    const { error } = await this.sb
      .from('articulos_categorias')
      .insert(unicas.map((categoria_id) => ({ articulo_id: articuloId, categoria_id })));
    if (error) throw error;
  }

  /** Quita el join embebido del payload y fuerza autor de texto libre. */
  private normalizar(art: Partial<Articulo>): Record<string, unknown> {
    const { categorias: _omit, id: _id, ...resto } = art as Record<string, unknown>;
    const copia = { ...resto } as Record<string, unknown>;
    copia['autor_tipo'] = 'libre';
    copia['autor_uid'] = null;
    return copia;
  }
}
