/**
 * set-admin-activo
 *
 * Activa / desactiva la cuenta de OTRO administrador.
 *
 * Por qué es una Edge Function y no un UPDATE directo desde el panel:
 * la policy de RLS de `perfiles_admin` para UPDATE es `id = auth.uid()`
 * (un admin solo puede tocar su propia fila), así que desde el cliente es
 * imposible desactivar a otra persona — y además ese camino permitiría que un
 * admin se auto-desactive y se deje fuera. Aquí se hace con `service_role`,
 * validando primero que quien llama es admin activo, y con dos candados:
 *   1. No puedes desactivarte a ti mismo.
 *   2. No puedes desactivar al último admin activo.
 *
 * Body: { "id": "<uuid del perfil>", "activo": boolean }
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

interface Payload {
  id?: string;
  activo?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const quienLlama = await requireAdmin(req);

    const { id, activo } = (await req.json().catch(() => ({}))) as Payload;
    if (!id || typeof activo !== 'boolean') {
      return json({ error: 'Se requiere { id: uuid, activo: boolean }' }, 400);
    }

    if (id === quienLlama.id && activo === false) {
      return json(
        { error: 'No puedes desactivar tu propia cuenta.' },
        400,
      );
    }

    const admin = adminClient();

    // Candado: no dejar el sistema sin ningún admin activo.
    if (activo === false) {
      const { count } = await admin
        .from('perfiles_admin')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true);
      if ((count ?? 0) <= 1) {
        return json(
          { error: 'No puedes desactivar al último administrador activo.' },
          400,
        );
      }
    }

    const { data, error } = await admin
      .from('perfiles_admin')
      .update({ activo })
      .eq('id', id)
      .select('id, nombre_visible, activo')
      .maybeSingle();

    if (error) return json({ error: error.message }, 400);
    if (!data) return json({ error: 'Perfil no encontrado' }, 404);

    return json({ ok: true, perfil: data });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
