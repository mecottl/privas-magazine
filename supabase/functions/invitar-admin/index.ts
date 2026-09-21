/**
 * invitar-admin (CLAUDE.md → tabla de Edge Functions · brief "lógica real")
 *
 * Quién la llama: un admin logueado con `nivel_permiso` de `dueno` o
 * `admin_total` — un `editor` no puede invitar a nadie. ÚNICA vía
 * autorizada para crear cuentas de admin.
 *
 * Matriz de a quién puede invitar cada nivel (poder absoluto es solo del
 * dueño — ver CLAUDE.md → niveles de permiso):
 *   - `dueno`: cualquier nivel (dueno, admin_total, editor).
 *   - `admin_total`: solo `editor`.
 *   - `editor`: nada, 403.
 *
 * 1. requireAdmin + chequeo manual del nivel de quien llama (arriba).
 * 2. Body: { email, nombre_visible, nivel_permiso }.
 * 3. Valida nivel_permiso contra los valores del CHECK y contra lo que el
 *    nivel de quien llama puede otorgar.
 * 4. Con service_role:
 *      - auth.admin.inviteUserByEmail(email, { redirectTo, data }) → crea el
 *        usuario y envía el correo de invitación de Supabase. `data` lleva
 *        `{ nivel_permiso }` para que la plantilla del correo pueda mostrar
 *        texto distinto según el rol (issue #61) vía `{{ .Data.nivel_permiso }}`.
 *        redirectTo = SITE_URL + /gestion-privas/aceptar-invitacion, la
 *        pantalla donde la persona invitada pone su contraseña. Esa URL debe
 *        estar en Authentication → URL Configuration → Redirect URLs.
 *      - insert en perfiles_admin { id, nombre_visible, nivel_permiso, activo: true }.
 * 5. Si el insert falla tras crear el usuario → rollback con auth.admin.deleteUser().
 * 6. 200 con los datos del nuevo admin (sin nada sensible).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

/** Valores admitidos por el CHECK de perfiles_admin.nivel_permiso. */
const NIVELES_PERMITIDOS = ['dueno', 'admin_total', 'editor'] as const;
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
    const quienLlama = await requireAdmin(req);
    if (quienLlama.nivel_permiso === 'editor') {
      return json({ error: 'No tienes permiso para invitar administradores.' }, 403);
    }

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
    if (quienLlama.nivel_permiso === 'admin_total' && nivel_permiso !== 'editor') {
      return json({ error: 'Un administrador solo puede invitar editores.' }, 403);
    }

    const admin = adminClient();

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://privasmagazine.com';
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/gestion-privas/aceptar-invitacion`;

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo, data: { nivel_permiso, nombre_visible: nombre_visible ?? null } },
    );
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
