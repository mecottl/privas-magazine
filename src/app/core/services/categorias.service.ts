import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import type { Categoria } from '../models';
import { slugify } from './slug';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly sb = inject(SupabaseService).client;

  async listar(): Promise<Categoria[]> {
    const { data, error } = await this.sb
      .from('categorias')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data as Categoria[];
  }

  async crear(nombre: string, slug?: string): Promise<Categoria> {
    const { data, error } = await this.sb
      .from('categorias')
      .insert({ nombre: nombre.trim(), slug: (slug || slugify(nombre)).trim() })
      .select()
      .single();
    if (error) throw error;
    return data as Categoria;
  }

  async actualizar(id: string, cambios: Partial<Categoria>): Promise<void> {
    const patch = { ...cambios };
    // El slug siempre se deriva del nombre.
    if (patch.nombre) patch.slug = slugify(patch.nombre);
    const { error } = await this.sb.from('categorias').update(patch).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb.from('categorias').delete().eq('id', id);
    if (error) throw error;
  }
}
