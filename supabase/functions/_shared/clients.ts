import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Cliente con service_role — SOLO en Edge Functions, acceso total (bypassa RLS). */
export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

/** Cliente que actúa como el usuario que llamó (respeta RLS / is_admin()). */
export function userClient(req: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    },
  );
}

/** Verifica que quien llama sea admin (usa la función is_admin() vía RLS). */
export async function requireAdmin(req: Request) {
  const supabase = userClient(req);
  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('id, nivel_permiso')
    .maybeSingle();
  if (!perfil) throw new Response('No autorizado', { status: 403 });
  return perfil;
}
