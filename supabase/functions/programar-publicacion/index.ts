/**
 * programar-publicacion (CLAUDE.md → sección "Programación de publicación + recompilación automática" · brief "lógica real")
 *
 * Quién la llama: pg_cron cada 15 min, autenticado con CRON_SECRET.
 *
 * 1. Valida CRON_SECRET (header Authorization: Bearer <CRON_SECRET>). Si falla → 401.
 * 2. Con service_role: pasa a 'publicado' lo programado cuya fecha ya venció,
 *    en `articulos` y `ediciones_revista`.
 * 3. Si hubo filas afectadas (> 0):
 *      - Dispara `repository_dispatch` (event `rebuild-sitio`) hacia GitHub
 *        para regenerar el sitio estático con el Open Graph correcto.
 *      - Newsletter vía Resend "marketing" — SOLO si RESEND_API_KEY existe;
 *        envuelto en su propio try/catch para no tumbar la función.
 * 4. Purga (DELETE real) lo de la papelera con más de 30 días en
 *    `eliminado_en` (issue #77) — reutiliza este mismo cron de 15 min en vez
 *    de agregar uno nuevo. El DELETE real ya dispara la limpieza de archivos
 *    huérfanos existente (trigger → `eliminar-archivo`).
 * 5. 200 con un resumen.
 *
 * SECRETOS DE ESTA EDGE FUNCTION (Supabase, no GitHub Actions — es Supabase
 * quien llama a GitHub):
 *   - CRON_SECRET        : token compartido con la llamada de pg_cron.
 *   - GH_DISPATCH_TOKEN  : PAT de GitHub con permiso de dispatch sobre el repo.
 *                          NO puede llamarse GITHUB_* (prefijo reservado).
 *   - GH_DISPATCH_REPO   : opcional, "owner/repo" (default mecottl/privas-magazine).
 *   - RESEND_API_KEY     : opcional hoy (sin dominio) — si falta, se salta el envío.
 *   - NEWSLETTER_FROM / RESEND_AUDIENCE_ID : remitente y audiencia de Resend.
 */
import { json } from '../_shared/cors.ts';
import { adminClient, requireCronSecret } from '../_shared/clients.ts';
import {
  type ArticuloPub,
  type EdicionPub,
  dispararRebuild,
  notificarNewsletter,
} from '../_shared/publicacion.ts';

Deno.serve(async (req) => {
  try {
    requireCronSecret(req);
  } catch (e) {
    return e instanceof Response ? e : json({ error: String(e) }, 401);
  }

  const supabase = adminClient();
  const ahora = new Date().toISOString();

  const { data: articulos, error: errA } = await supabase
    .from('articulos')
    .update({ estado: 'publicado' })
    .eq('estado', 'programado')
    .lte('fecha_publicacion', ahora)
    .select('id, titulo, slug');

  const { data: ediciones, error: errE } = await supabase
    .from('ediciones_revista')
    .update({ estado: 'publicado' })
    .eq('estado', 'programado')
    .lte('fecha_publicacion', ahora)
    .select('id, titulo');

  if (errA || errE) {
    return json({ error: errA?.message ?? errE?.message }, 500);
  }

  const listaArticulos = (articulos ?? []) as ArticuloPub[];
  const listaEdiciones = (ediciones ?? []) as EdicionPub[];
  const cambios = listaArticulos.length + listaEdiciones.length;

  let rebuildDisparado = false;
  let newsletter: { enviado: boolean; motivo?: string } = { enviado: false };
  if (cambios > 0) {
    rebuildDisparado = await dispararRebuild();
    newsletter = await notificarNewsletter(listaArticulos, listaEdiciones);
  }

  // Purga de la papelera (issue #77): 30 días en eliminado_en.
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: articulosPurgados } = await supabase
    .from('articulos')
    .delete()
    .not('eliminado_en', 'is', null)
    .lte('eliminado_en', hace30dias)
    .select('id');
  const { data: edicionesPurgadas } = await supabase
    .from('ediciones_revista')
    .delete()
    .not('eliminado_en', 'is', null)
    .lte('eliminado_en', hace30dias)
    .select('id');

  return json({
    ok: true,
    publicados: {
      articulos: listaArticulos.length,
      ediciones: listaEdiciones.length,
    },
    rebuildDisparado,
    newsletter,
    purgados: {
      articulos: articulosPurgados?.length ?? 0,
      ediciones: edicionesPurgadas?.length ?? 0,
    },
  });
});
