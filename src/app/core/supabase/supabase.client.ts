import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Cliente único de Supabase para todo el frontend (público + panel).
 * Usa SOLO la anon key. La seguridad real la aplica RLS + `is_admin()`
 * en la base de datos (ver CLAUDE.md).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );

  /** Invoca una Edge Function pasando el JWT del admin logueado. */
  invokeFunction<T = unknown>(name: string, body?: unknown) {
    return this.client.functions.invoke<T>(name, {
      body: body as Record<string, unknown> | undefined,
    });
  }
}
