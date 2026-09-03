import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly supabase = inject(SupabaseService);

  /** INSERT directo con la clave pública — RLS permite el insert sin sesión. */
  async suscribir(email: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await this.supabase.client
      .from('suscriptores_newsletter')
      .insert({ email: email.trim().toLowerCase() });
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ese correo ya está registrado.' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
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
