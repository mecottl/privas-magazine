/**
 * Efectos secundarios de publicar contenido (recompilación + newsletter).
 * Compartido por `programar-publicacion` (cron, contenido programado) y
 * `notificar-publicacion` (admin, "Publicar ahora" — issue #64: antes de
 * esto, publicar de inmediato no disparaba ninguno de los dos).
 */

export interface ArticuloPub {
  id: string;
  titulo: string;
  slug: string;
}
export interface EdicionPub {
  id: string;
  titulo: string;
}

/** Dispara el workflow `deploy.yml` vía `repository_dispatch`. */
export async function dispararRebuild(): Promise<boolean> {
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
 * Manda el newsletter por lo recién publicado.
 * Silencioso si RESEND_API_KEY no está configurada. NO propaga errores.
 */
export async function notificarNewsletter(
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
        // {{{RESEND_UNSUBSCRIBE_URL}}} es el merge tag nativo de Resend — un
        // broadcast a toda la audiencia no puede llevar un link con nuestro
        // propio token por destinatario (issue #64).
        html: `<h1>Nuevas publicaciones</h1><ul>${items}</ul>
               <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Darse de baja</a></p>`,
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
