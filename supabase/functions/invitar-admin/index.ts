/**
 * invitar-admin (CLAUDE.md § 4 · brief "lógica real")
 *
 * Quién la llama: un admin ya logueado, desde el panel.
 * ÚNICA vía autorizada para crear cuentas de admin.
 *
 * 1. Valida que quien llama es admin activo (requireAdmin).
 * 2. Body: { email, nombre_visible, nivel_permiso }.
 * 3. Valida nivel_permiso contra los valores del CHECK (hoy solo 'admin_total').
 * 4. Con service_role:
 *      - auth.admin.inviteUserByEmail(email) → crea el usuario y envía el
 *        correo de invitación de Supabase (plantilla en inglés por ahora).
 *      - insert en perfiles_admin { id, nombre_visible, nivel_permiso, activo: true }.
 * 5. Si el insert falla tras crear el usuario → rollback con auth.admin.deleteUser().
 * 6. 200 con los datos del nuevo admin (sin nada sensible).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

/** Valores admitidos por el CHECK de perfiles_admin.nivel_permiso (CLAUDE.md). */
const NIVELES_PERMITIDOS = ['admin_total'] as const;
type NivelPermiso = (typeof NIVELES_PERMITIDOS)[number];

interface Payload {
  email?: string;
  nombre_visible?: string;
  nivel_permiso?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    await requireAdmin(req);

    const { email, nombre_visible, nivel_permiso } = (await req
      .json()
      .catch(() => ({}))) as Payload;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Email inválido' }, 400);
    }
    if (!nivel_permiso || !NIVELES_PERMITIDOS.includes(nivel_permiso as NivelPermiso)) {
      return json(
        {
          error: `nivel_permiso inválido. Valores permitidos: ${NIVELES_PERMITIDOS.join(', ')}`,
        },
        400,
      );
    }

    const admin = adminClient();

    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email);
    if (inviteErr || !invited.user) {
      return json(
        { error: inviteErr?.message ?? 'No se pudo invitar al usuario' },
        400,
      );
    }

    const { error: perfilErr } = await admin.from('perfiles_admin').insert({
      id: invited.user.id,
      nombre_visible: nombre_visible ?? null,
      nivel_permiso,
      activo: true,
    });

    if (perfilErr) {
      // Rollback: no dejar una cuenta de Auth huérfana sin perfil.
      await admin.auth.admin.deleteUser(invited.user.id);
      return json({ error: `No se pudo crear el perfil: ${perfilErr.message}` }, 400);
    }

    return json({
      ok: true,
      admin: {
        id: invited.user.id,
        email: invited.user.email,
        nombre_visible: nombre_visible ?? null,
        nivel_permiso,
        activo: true,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
