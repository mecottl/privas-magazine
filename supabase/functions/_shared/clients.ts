import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { json } from './cors.ts';

/** Cliente con service_role — SOLO en Edge Functions, acceso total (bypassa RLS). */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

/** Cliente que actúa como el usuario que llamó (respeta RLS / is_admin()). */
export function userClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    },
  );
}

export interface PerfilAdmin {
  id: string;
  nombre_visible: string | null;
  nivel_permiso: string;
  activo: boolean;
}

/**
 * Verifica que quien llama sea un admin ACTIVO.
 *
 * Se repite aquí la lógica de `is_admin()` porque la función corre con
 * `service_role` (se salta RLS por diseño). Se resuelve el JWT del header
 * `Authorization` contra Auth y luego se busca su perfil con `service_role`.
 *
 * Lanza un `Response` (401/403) que el handler debe devolver tal cual.
 */
export async function requireAdmin(req: Request): Promise<PerfilAdmin> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw json({ error: 'Falta el token de sesión' }, 401);

  const admin = adminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    throw json({ error: 'Sesión inválida' }, 401);
  }

  const { data: perfil } = await admin
    .from('perfiles_admin')
    .select('id, nombre_visible, nivel_permiso, activo')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!perfil || perfil.activo !== true) {
    throw json({ error: 'No autorizado' }, 403);
  }
  return perfil as PerfilAdmin;
}

/**
 * Valida que quien llama sea el propio sistema (pg_cron), comparando el header
 * `Authorization: Bearer <CRON_SECRET>` contra la variable de entorno.
 * Lanza un `Response` 401 si no coincide.
 */
export function requireCronSecret(req: Request): void {
  const expected = Deno.env.get('CRON_SECRET');
  const got = (req.headers.get('Authorization') ?? '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!expected || got !== expected) {
    throw json({ error: 'No autorizado' }, 401);
  }
}
