/**
 * invitar-admin (CLAUDE.md § 4)
 *
 * ÚNICA vía autorizada para crear cuentas de admin. Usa el service_role key
 * (nunca expuesto al frontend):
 *   1. auth.admin.createUser()  → cuenta en auth.users
 *   2. insert en perfiles_admin con el nivel_permiso indicado
 *
 * Quien llama debe ser admin. No exponer ningún otro flujo de alta de admins.
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

interface Payload {
  email: string;
  nombre?: string;
  nivel_permiso?: string; // hoy solo 'admin_total' (CHECK en la tabla)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const { email, nombre, nivel_permiso = 'admin_total' } =
      (await req.json()) as Payload;
    if (!email) return json({ error: 'Falta "email"' }, 400);

    const admin = adminClient();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'No se pudo crear el usuario' }, 400);
    }

    const { error: perfilErr } = await admin.from('perfiles_admin').insert({
      id: created.user.id,
      nombre: nombre ?? null,
      nivel_permiso,
    });
    if (perfilErr) {
      await admin.auth.admin.deleteUser(created.user.id); // rollback
      return json({ error: perfilErr.message }, 400);
    }

    // TODO: enviar invitación / magic link al correo (Supabase Auth o Resend)
    return json({ ok: true, user_id: created.user.id });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
