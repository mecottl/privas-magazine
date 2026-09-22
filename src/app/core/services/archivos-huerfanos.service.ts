import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';

export interface ReporteHuerfanos {
  revisado: string;
  totalRemotos: number;
  totalReferenciados: number;
  huerfanos: string[];
  rotos: { path: string; origen: string }[];
}

@Injectable({ providedIn: 'root' })
export class ArchivosHuerfanosService {
  private readonly supabase = inject(SupabaseService);

  /** Issue #66 — solo reporta, nunca borra nada. */
  async auditar(): Promise<ReporteHuerfanos> {
    const { data, error } = await this.supabase.invokeFunction<
      ReporteHuerfanos & { error?: string }
    >('auditar-huerfanos', {});
    if (error || !data || data.error) {
      throw new Error(data?.error ?? error?.message ?? 'No se pudo auditar.');
    }
    return data;
  }
}
