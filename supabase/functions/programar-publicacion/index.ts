/**
 * programar-publicacion (CLAUDE.md § 3 y § 5)
 *
 * Disparada por pg_cron cada 15 min. Publica lo programado y, si hubo cambios,
 * dispara la recompilación del sitio (webhook a GitHub Actions vía pg_net /
 * fetch) para regenerar el HTML estático con el Open Graph correcto.
 * También notifica al newsletter cuando algo pasa a 'publicado'.
 */
import { json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/clients.ts';

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

  if (cambios > 0) {
    // TODO: disparar rebuild en GitHub Actions
    //   POST https://api.github.com/repos/<owner>/privas-magazine/dispatches
    //   { event_type: 'rebuild-sitio' }  con GITHUB_DISPATCH_TOKEN (secreto)
    // TODO: notificar newsletter (Resend marketing) por cada artículo/edición nuevo
  }

  return json({ publicados: cambios, articulos, ediciones });
});
