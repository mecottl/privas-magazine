/**
 * programar-publicacion (CLAUDE.md § 3 y § 5)
 *
 * Disparada por pg_cron cada 15 min. Publica lo programado y, si hubo cambios,
 * dispara la recompilación del sitio (webhook a GitHub Actions vía pg_net /
 * fetch) para regenerar el HTML estático con el Open Graph correcto.
 * También notifica al newsletter cuando algo pasa a 'publicado'.
 *
 * Es SUPABASE quien llama a GitHub (no al revés). Estos valores son
 * SECRETOS DE ESTA EDGE FUNCTION (Supabase → Project Settings → Edge Functions
 * → Secrets, o `supabase secrets set`), NO secretos de GitHub Actions:
 *   - GH_DISPATCH_TOKEN : PAT de GitHub con permiso `repo` (o fine-grained con
 *                         "Contents: read/write" o el scope de dispatch).
 *                         NO puede llamarse GITHUB_* — GitHub reserva ese
 *                         prefijo, pero además aquí el consumidor es Supabase.
 *   - GH_DISPATCH_REPO  : "owner/repo" destino (default: mecottl/privas-magazine).
 */
import { json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/clients.ts';

/**
 * Dispara el workflow `deploy.yml` vía `repository_dispatch` (event
 * `rebuild-sitio`). Lee el token del SECRETO DE ESTA FUNCIÓN `GH_DISPATCH_TOKEN`.
 */
async function dispararRebuild(): Promise<boolean> {
  const token = Deno.env.get('GH_DISPATCH_TOKEN');
  const repo = Deno.env.get('GH_DISPATCH_REPO') ?? 'mecottl/privas-magazine';
  if (!token) {
    console.error('GH_DISPATCH_TOKEN no configurado — se omite el rebuild');
    return false;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'privas-magazine-edge',
    },
    body: JSON.stringify({ event_type: 'rebuild-sitio' }),
  });

  if (!res.ok) {
    console.error(`repository_dispatch falló: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

Deno.serve(async () => {
  const supabase = adminClient();
  const ahora = new Date().toISOString();

  const { data: articulos } = await supabase
    .from('articulos')
    .update({ estado: 'publicado' })
    .eq('estado', 'programado')
    .lte('fecha_publicacion', ahora)
    .select('id, titulo, slug');

  const { data: ediciones } = await supabase
    .from('ediciones_revista')
    .update({ estado: 'publicado' })
    .eq('estado', 'programado')
    .lte('fecha_publicacion', ahora)
    .select('id, titulo');

  const cambios = (articulos?.length ?? 0) + (ediciones?.length ?? 0);

  let rebuildDisparado = false;
  if (cambios > 0) {
    rebuildDisparado = await dispararRebuild();
    // TODO: notificar newsletter (Resend marketing) por cada artículo/edición nuevo
  }

  return json({ publicados: cambios, articulos, ediciones, rebuildDisparado });
});
