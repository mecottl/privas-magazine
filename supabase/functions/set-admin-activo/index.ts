/**
 * set-admin-activo
 *
 * Gestiona la cuenta de OTRO administrador: activar/desactivar, cambiar su
 * nivel de permiso, restablecerle la contraseña, o eliminarla por completo.
 * A pesar del nombre (histórico, de cuando solo activaba/desactivaba), hoy
 * cubre las cuatro acciones — se mantiene un solo archivo en vez de cuatro
 * funciones casi idénticas.
 *
 * Por qué es una Edge Function y no un UPDATE directo desde el panel: la
 * policy de RLS de `perfiles_admin` para UPDATE es `id = auth.uid()` (un
 * admin solo puede tocar su propia fila, y solo la columna `nombre_visible`
 * — ver migración `restringir_autoedicion_y_borrado_admin`), así que desde
 * el cliente es imposible tocar a otra persona o auto-promoverse. Aquí se
 * hace con `service_role`.
 *
 * Matriz de permisos (poder absoluto es solo del `dueno` — CLAUDE.md →
 * niveles de permiso):
 *   - `editor`: no puede llamar esta función en absoluto (403).
 *   - `admin_total`: solo puede activar/desactivar o ELIMINAR cuentas cuyo
 *     `nivel_permiso` sea `editor`. No puede cambiar `nivel_permiso` de
 *     nadie ni restablecer contraseñas ajenas — eso es exclusivo del dueño.
 *   - `dueno`: puede todo, sobre cualquier cuenta (activo, nivel_permiso,
 *     password, eliminar), con los candados de abajo.
 *
 * Candados (aplican sobre quien LLAMA y, para el dueño, también sobre la
 * cuenta objetivo):
 *   1. Nadie se desactiva ni se elimina a sí mismo.
 *   2. Nunca puede quedar el sistema sin ningún admin activo.
 *   3. Nunca puede quedar sin ningún `admin_total` activo (al desactivar,
 *      degradar a editor, o eliminar).
 *   4. Nunca puede quedar sin ningún `dueno` activo (mismas tres acciones).
 *
 * Body: { id: uuid, activo?: boolean, nivel_permiso?: 'dueno'|'admin_total'|'editor',
 *         password?: string, eliminar?: true }
 * `eliminar` borra la cuenta por completo (auth.users + perfiles_admin en
 * cascada) e ignora el resto de los campos; sus artículos quedan sin dueño
 * (`creado_por = null`, ver misma migración) en vez de bloquear el borrado.
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';
import { registrarBitacora } from '../_shared/bitacora.ts';

const NIVELES_PERMITIDOS = ['dueno', 'admin_total', 'editor'] as const;
type NivelPermiso = (typeof NIVELES_PERMITIDOS)[number];

interface Payload {
  id?: string;
  activo?: boolean;
  nivel_permiso?: NivelPermiso;
  password?: string;
  eliminar?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const quienLlama = await requireAdmin(req);
    if (quienLlama.nivel_permiso === 'editor') {
      return json({ error: 'No tienes permiso para gestionar otras cuentas.' }, 403);
    }
    const esDueno = quienLlama.nivel_permiso === 'dueno';

    const { id, activo, nivel_permiso, password, eliminar } =
      (await req.json().catch(() => ({}))) as Payload;

    if (!id) return json({ error: 'Se requiere { id: uuid }' }, 400);
    if (nivel_permiso && !NIVELES_PERMITIDOS.includes(nivel_permiso)) {
      return json({ error: 'nivel_permiso inválido' }, 400);
    }
    if (!esDueno && (nivel_permiso || password)) {
      return json(
        { error: 'Cambiar el nivel de permiso o la contraseña de otra cuenta es solo del dueño.' },
        403,
      );
    }
    if (!eliminar && activo === undefined && !nivel_permiso && !password) {
      return json(
        { error: 'Se requiere activo, nivel_permiso, password o eliminar.' },
        400,
      );
    }
    if (password && password.length < 8) {
      return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
    }

    const admin = adminClient();

    const { data: objetivo, error: errObjetivo } = await admin
      .from('perfiles_admin')
      .select('id, activo, nivel_permiso')
      .eq('id', id)
      .maybeSingle();
    if (errObjetivo) return json({ error: errObjetivo.message }, 400);
    if (!objetivo) return json({ error: 'Perfil no encontrado' }, 404);

    // Un admin_total (no-dueño) solo gestiona cuentas de editor.
    if (!esDueno && objetivo.nivel_permiso !== 'editor') {
      return json(
        { error: 'Un administrador solo puede gestionar cuentas de editor.' },
        403,
      );
    }

    const contarActivos = async (nivel?: NivelPermiso, excluirId?: string) => {
      let q = admin
        .from('perfiles_admin')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true);
      if (nivel) q = q.eq('nivel_permiso', nivel);
      if (excluirId) q = q.neq('id', excluirId);
      const { count } = await q;
      return count ?? 0;
    };

    if (eliminar) {
      if (id === quienLlama.id) {
        return json({ error: 'No puedes eliminar tu propia cuenta.' }, 400);
      }
      if (objetivo.activo && (await contarActivos()) <= 1) {
        return json({ error: 'No puedes eliminar al último administrador activo.' }, 400);
      }
      if (
        objetivo.activo &&
        (objetivo.nivel_permiso === 'admin_total' || objetivo.nivel_permiso === 'dueno') &&
        (await contarActivos(objetivo.nivel_permiso as NivelPermiso, id)) === 0
      ) {
        return json(
          { error: `No puedes eliminar al último ${objetivo.nivel_permiso === 'dueno' ? 'dueño' : 'administrador total'} activo.` },
          400,
        );
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      await registrarBitacora({
        adminId: quienLlama.id,
        adminNombre: quienLlama.nombre_visible,
        accion: 'eliminar_admin',
        tabla: 'perfiles_admin',
        registroId: id,
        detalle: { nivel_permiso: objetivo.nivel_permiso },
      });
      return json({ ok: true });
    }

    if (activo === false && id === quienLlama.id) {
      return json({ error: 'No puedes desactivar tu propia cuenta.' }, 400);
    }
    if (activo === false && (await contarActivos()) <= 1) {
      return json({ error: 'No puedes desactivar al último administrador activo.' }, 400);
    }
    if (
      activo === false &&
      (objetivo.nivel_permiso === 'admin_total' || objetivo.nivel_permiso === 'dueno') &&
      (await contarActivos(objetivo.nivel_permiso as NivelPermiso, id)) === 0
    ) {
      return json(
        { error: `No puedes desactivar al último ${objetivo.nivel_permiso === 'dueno' ? 'dueño' : 'administrador total'} activo.` },
        400,
      );
    }
    if (
      nivel_permiso &&
      nivel_permiso !== objetivo.nivel_permiso &&
      (objetivo.nivel_permiso === 'admin_total' || objetivo.nivel_permiso === 'dueno') &&
      objetivo.activo &&
      (await contarActivos(objetivo.nivel_permiso as NivelPermiso, id)) === 0
    ) {
      return json(
        { error: `No puedes quitarle ${objetivo.nivel_permiso === 'dueno' ? 'dueño' : 'admin_total'} al último activo.` },
        400,
      );
    }

    if (password) {
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
    }

    const cambios: Partial<{ activo: boolean; nivel_permiso: NivelPermiso }> = {};
    if (activo !== undefined) cambios.activo = activo;
    if (nivel_permiso) cambios.nivel_permiso = nivel_permiso;

    let perfil = objetivo;
    if (Object.keys(cambios).length > 0) {
      const { data, error } = await admin
        .from('perfiles_admin')
        .update(cambios)
        .eq('id', id)
        .select('id, nombre_visible, activo, nivel_permiso')
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: 'Perfil no encontrado' }, 404);
      perfil = data;
    }

    const detalleCambios: Record<string, unknown> = {};
    if (password) detalleCambios['password'] = true;
    if (activo !== undefined) detalleCambios['activo'] = activo;
    if (nivel_permiso) detalleCambios['nivel_permiso'] = nivel_permiso;
    if (Object.keys(detalleCambios).length > 0) {
      await registrarBitacora({
        adminId: quienLlama.id,
        adminNombre: quienLlama.nombre_visible,
        accion: 'gestionar_admin',
        tabla: 'perfiles_admin',
        registroId: id,
        detalle: detalleCambios,
      });
    }

    return json({ ok: true, perfil });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
