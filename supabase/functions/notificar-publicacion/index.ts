/**
 * notificar-publicacion (issue #64)
 *
 * Quién la llama: un admin logueado, desde el panel, justo después de
 * "Publicar ahora" en un artículo o edición (`estado` ya se puso en
 * 'publicado' con un update directo del cliente — RLS lo permite).
 *
 * Antes de esto, publicar de inmediato NO disparaba recompilación ni
 * newsletter — solo `programar-publicacion` (cron) lo hacía, y solo para
 * contenido que pasó por "Programar". Esta función reutiliza exactamente la
 * misma lógica (`_shared/publicacion.ts`) para que "Publicar ahora" haga lo
 * mismo.
 *
 * Body: `{ articulos?: [{id,titulo,slug}], ediciones?: [{id,titulo}] }`.
 * 200 siempre que el caller esté autorizado (los fallos de rebuild/newsletter
 * son no fatales, igual que en programar-publicacion).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/clients.ts';
import {
  type ArticuloPub,
  type EdicionPub,
  dispararRebuild,
  notificarNewsletter,
} from '../_shared/publicacion.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const articulos = Array.isArray((body as Record<string, unknown>)?.['articulos'])
      ? ((body as Record<string, unknown>)['articulos'] as ArticuloPub[])
      : [];
    const ediciones = Array.isArray((body as Record<string, unknown>)?.['ediciones'])
      ? ((body as Record<string, unknown>)['ediciones'] as EdicionPub[])
      : [];

    if (articulos.length === 0 && ediciones.length === 0) {
      return json({ error: 'Nada que notificar' }, 400);
    }

    const rebuildDisparado = await dispararRebuild();
    const newsletter = await notificarNewsletter(articulos, ediciones);

    return json({ ok: true, rebuildDisparado, newsletter });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
