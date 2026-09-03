import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import type { Marca } from '../models';

@Injectable({ providedIn: 'root' })
export class MarcasService {
  private readonly sb = inject(SupabaseService).client;

  async listar(): Promise<Marca[]> {
    const { data, error } = await this.sb
      .from('marcas')
      .select('*')
      .order('orden');
    if (error) throw error;
    return data as Marca[];
  }

  async crear(m: Partial<Marca>): Promise<Marca> {
    const { data, error } = await this.sb
      .from('marcas')
      .insert({
        nombre: m.nombre,
        red_social_url: m.red_social_url,
        logo_url: m.logo_url ?? null,
        orden: m.orden ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Marca;
  }

  async actualizar(id: string, m: Partial<Marca>): Promise<void> {
    const { error } = await this.sb.from('marcas').update(m).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb.from('marcas').delete().eq('id', id);
    if (error) throw error;
  }
}
