/**
 * set-admin-activo
 *
 * Gestiona la cuenta de OTRO administrador: activar/desactivar, cambiar su
 * nivel de permiso, o eliminarla por completo.
 *
 * Por qué es una Edge Function y no un UPDATE directo desde el panel: la
 * policy de RLS de `perfiles_admin` para UPDATE es `id = auth.uid()` (un
 * admin solo puede tocar su propia fila, y solo la columna `nombre_visible`
 * — ver migración `restringir_autoedicion_y_borrado_admin`), así que desde
 * el cliente es imposible tocar a otra persona o auto-promoverse. Aquí se
 * hace con `service_role`, validando primero que quien llama es admin_total,
 * con estos candados:
 *   1. No puedes desactivarte ni eliminarte a ti mismo.
 *   2. No puedes dejar el sistema sin ningún admin activo.
 *   3. No puedes dejar el sistema sin ningún `admin_total` activo (ni
 *      desactivando, ni degradando a editor, ni eliminando la cuenta).
 *
 * Body: { id: uuid, activo?: boolean, nivel_permiso?: 'admin_total'|'editor', eliminar?: true }
 * `eliminar` borra la cuenta por completo (auth.users + perfiles_admin en
 * cascada) e ignora `activo`/`nivel_permiso`; sus artículos quedan sin dueño
 * (`creado_por = null`, ver misma migración) en vez de bloquear el borrado.
 *
 * Solo `admin_total` puede llamarla — un `editor` no gestiona otras cuentas
 * (CLAUDE.md → niveles de permiso).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdminTotal } from '../_shared/clients.ts';

const NIVELES_PERMITIDOS = ['admin_total', 'editor'] as const;
type NivelPermiso = (typeof NIVELES_PERMITIDOS)[number];

interface Payload {
  id?: string;
  activo?: boolean;
  nivel_permiso?: NivelPermiso;
  eliminar?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const quienLlama = await requireAdminTotal(req);
    const { id, activo, nivel_permiso, eliminar } =
      (await req.json().catch(() => ({}))) as Payload;

    if (!id) return json({ error: 'Se requiere { id: uuid }' }, 400);
    if (nivel_permiso && !NIVELES_PERMITIDOS.includes(nivel_permiso)) {
      return json({ error: 'nivel_permiso inválido' }, 400);
    }
    if (!eliminar && activo === undefined && !nivel_permiso) {
      return json(
        { error: 'Se requiere activo, nivel_permiso o eliminar.' },
        400,
      );
    }

    const admin = adminClient();

    const { data: objetivo, error: errObjetivo } = await admin
      .from('perfiles_admin')
      .select('id, activo, nivel_permiso')
      .eq('id', id)
      .maybeSingle();
    if (errObjetivo) return json({ error: errObjetivo.message }, 400);
    if (!objetivo) return json({ error: 'Perfil no encontrado' }, 404);

    const sePuedeDesactivar = async () => {
      const { count } = await admin
        .from('perfiles_admin')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true);
      return (count ?? 0) > 1;
    };
    const quedanOtrosAdminTotal = async () => {
      const { count } = await admin
        .from('perfiles_admin')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true)
        .eq('nivel_permiso', 'admin_total')
        .neq('id', id);
      return (count ?? 0) > 0;
    };

    if (eliminar) {
      if (id === quienLlama.id) {
        return json({ error: 'No puedes eliminar tu propia cuenta.' }, 400);
      }
      if (objetivo.activo && !(await sePuedeDesactivar())) {
        return json(
          { error: 'No puedes eliminar al último administrador activo.' },
          400,
        );
      }
      if (
        objetivo.activo &&
        objetivo.nivel_permiso === 'admin_total' &&
        !(await quedanOtrosAdminTotal())
      ) {
        return json(
          { error: 'No puedes eliminar al último administrador total activo.' },
          400,
        );
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (activo === false && id === quienLlama.id) {
      return json({ error: 'No puedes desactivar tu propia cuenta.' }, 400);
    }
    if (activo === false && !(await sePuedeDesactivar())) {
      return json(
        { error: 'No puedes desactivar al último administrador activo.' },
        400,
      );
    }
    if (
      nivel_permiso &&
      nivel_permiso !== 'admin_total' &&
      objetivo.nivel_permiso === 'admin_total' &&
      objetivo.activo &&
      !(await quedanOtrosAdminTotal())
    ) {
      return json(
        {
          error:
            'No puedes quitarle admin_total al último administrador total activo.',
        },
        400,
      );
    }

    const cambios: Partial<{ activo: boolean; nivel_permiso: NivelPermiso }> = {};
    if (activo !== undefined) cambios.activo = activo;
    if (nivel_permiso) cambios.nivel_permiso = nivel_permiso;

    const { data, error } = await admin
      .from('perfiles_admin')
      .update(cambios)
      .eq('id', id)
      .select('id, nombre_visible, activo, nivel_permiso')
      .maybeSingle();

    if (error) return json({ error: error.message }, 400);
    if (!data) return json({ error: 'Perfil no encontrado' }, 404);

    return json({ ok: true, perfil: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
