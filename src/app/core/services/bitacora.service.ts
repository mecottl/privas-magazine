import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';
import type { BitacoraEntrada } from '../models';

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private readonly sb = inject(SupabaseService).client;

  /** Panel: últimas N entradas, más recientes primero (issue #76). */
  async listar(limite = 100): Promise<BitacoraEntrada[]> {
    const { data, error } = await this.sb
      .from('bitacora_admin')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data as unknown as BitacoraEntrada[];
  }

  /** Borrar una fila (issue reportada en vivo). RLS: dueño/admin_total. */
  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb.from('bitacora_admin').delete().eq('id', id);
    if (error) throw error;
  }
}
