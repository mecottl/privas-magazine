/**
 * programar-publicacion (CLAUDE.md § 3 y § 5 · brief "lógica real")
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
 * 4. 200 con un resumen.
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

interface ArticuloPub {
  id: string;
  titulo: string;
  slug: string;
}
interface EdicionPub {
  id: string;
  titulo: string;
}

/** Dispara el workflow `deploy.yml` vía `repository_dispatch`. */
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

/**
 * Deja listo el envío de newsletter por lo recién publicado.
 * Silencioso si RESEND_API_KEY no está configurada (caso actual, sin dominio).
 * NO propaga errores — su try/catch es local.
 */
async function notificarNewsletter(
  articulos: ArticuloPub[],
  ediciones: EdicionPub[],
): Promise<{ enviado: boolean; motivo?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { enviado: false, motivo: 'RESEND_API_KEY ausente' };

  try {
    const from = Deno.env.get('NEWSLETTER_FROM') ?? 'PRIVAS Magazine <news@privasmagazine.com>';
    const audienceId = Deno.env.get('RESEND_AUDIENCE_ID');
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://privasmagazine.com';

    const items = [
      ...articulos.map((a) => `<li><a href="${siteUrl}/articulos/${a.slug}">${a.titulo}</a></li>`),
      ...ediciones.map((e) => `<li>${e.titulo} (nueva edición de la revista)</li>`),
    ].join('');

    // Resend "marketing" → broadcast a una audiencia (por contactos, no por email).
    const res = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audience_id: audienceId,
        from,
        subject: 'Novedades en PRIVAS Magazine',
        html: `<h1>Nuevas publicaciones</h1><ul>${items}</ul>
               <p><a href="${siteUrl}/newsletter/cancelar?token={{unsubscribe_token}}">Darse de baja</a></p>`,
      }),
    });
    if (!res.ok) {
      console.error(`Resend broadcast falló: ${res.status} ${await res.text()}`);
      return { enviado: false, motivo: `Resend ${res.status}` };
    }
    return { enviado: true };
  } catch (e) {
    console.error('Newsletter: error no fatal', e);
    return { enviado: false, motivo: String(e) };
  }
}

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

  return json({
    ok: true,
    publicados: {
      articulos: listaArticulos.length,
      ediciones: listaEdiciones.length,
    },
    rebuildDisparado,
    newsletter,
  });
});
