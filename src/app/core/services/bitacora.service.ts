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
}
