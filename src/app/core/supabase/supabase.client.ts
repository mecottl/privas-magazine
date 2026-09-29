import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  createClient,
  FunctionsHttpError,
  SupabaseClient,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { mfaOlvidarDispositivo } from '../auth/mfa-dispositivo';

/**
 * Cliente único de Supabase para todo el frontend (público + panel).
 * Usa SOLO la anon key. La seguridad real la aplica RLS + `is_admin()`
 * en la base de datos (ver CLAUDE.md).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly router = inject(Router);

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

  /**
   * Invoca una Edge Function pasando el JWT del usuario logueado.
   * Acepta un objeto JSON o un FormData (para subidas multipart).
   *
   * Cuando la función responde con un status distinto de 2xx, el SDK
   * devuelve `data: null` y un `FunctionsHttpError` cuyo `.message` es un
   * texto genérico ("Edge Function returned a non-2xx status code") — el
   * cuerpo real `{ error: "..." }` que sí mandan nuestras funciones vive en
   * `error.context` (el Response crudo), sin leer todavía. Lo leemos aquí y
   * lo devolvemos como `data` para que todos los servicios que ya hacían
   * `data?.error ?? error.message` (issue #69) empiecen a funcionar sin
   * tener que tocar cada uno por separado.
   */
  async invokeFunction<T = unknown>(
    name: string,
    body?: Record<string, unknown> | FormData,
  ) {
    const res = await this.client.functions.invoke<T>(name, { body });
    if (res.error instanceof FunctionsHttpError) {
      try {
        const cuerpo = await res.error.context.json();
        // issue #85: requireAdmin ahora sí verifica el MFA del lado del
        // servidor. Si lo rechaza, el dispositivo "recordado" localmente ya
        // no sirve — se olvida y se manda a verificar de verdad, en vez de
        // dejar que cada pantalla muestre el JSON crudo del error.
        if ((cuerpo as { codigo?: string } | null)?.codigo === 'mfa_requerido') {
          const { data } = await this.client.auth.getSession();
          const uid = data.session?.user?.id;
          if (uid) mfaOlvidarDispositivo(uid);
          void this.router.navigateByUrl(`/${environment.adminBasePath}/verificar-mfa`);
        }
        return { ...res, data: cuerpo as T };
      } catch {
        /* el cuerpo no era JSON válido — se deja el error genérico tal cual */
      }
    }
    return res;
  }
}
