import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Vía la Edge Function `suscribirse` (no INSERT directo): la policy
   * pública de INSERT se cerró para poder aplicar rate limiting antes de
   * escribir — ver migración `20260905000000_cerrar_insert_publico_newsletter.sql`.
   */
  async suscribir(email: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await this.supabase.invokeFunction<{
      ok?: boolean;
      error?: string;
    }>('suscribirse', { email: email.trim().toLowerCase() });
    if (error) {
      const detalle = (data as { error?: string } | null)?.error;
      return { ok: false, error: detalle ?? error.message };
    }
    return { ok: data?.ok ?? true };
  }

  async confirmar(token: string) {
    return this.llamar('confirmar-suscripcion', token);
  }

  async cancelar(token: string) {
    return this.llamar('cancelar-suscripcion', token);
  }

  private async llamar(
    fn: 'confirmar-suscripcion' | 'cancelar-suscripcion',
    token: string,
  ): Promise<{ ok: boolean; mensaje: string }> {
    const { data, error } = await this.supabase.invokeFunction<{
      ok?: boolean;
      mensaje?: string;
      error?: string;
    }>(fn, { token });
    if (error) {
      const detalle = (data as { error?: string } | null)?.error;
      return { ok: false, mensaje: detalle ?? error.message };
    }
    return { ok: data?.ok ?? true, mensaje: data?.mensaje ?? 'Listo.' };
  }
}
