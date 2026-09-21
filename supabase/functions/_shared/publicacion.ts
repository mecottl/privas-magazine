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
 * Mismo lenguaje visual que `docs/email-invitacion.html` y los correos de
 * MFA/confirmación de suscripción (cabecera teal + PRIVAS, cuerpo crema).
 */
function plantillaCorreo(itemsHtml: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#edeae1; padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#f7f2e7; border-radius:12px; overflow:hidden;">

        <tr>
          <td align="center" style="background-color:#256585; padding:32px 24px;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:26px; font-weight:700; letter-spacing:0.04em; color:#fbf7ee;">
              PRIVAS
            </div>
            <div style="font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:#bcd7de; margin-top:4px;">
              Magazine
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 32px 28px; font-family:Arial,Helvetica,sans-serif; color:#16323a;">
            <h1 style="margin:0 0 20px; font-family:Georgia,'Times New Roman',serif; font-size:20px; font-weight:700; color:#256585; text-align:center;">
              Novedades en PRIVAS Magazine
            </h1>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${itemsHtml}
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:18px 32px; border-top:1px solid #cec5ac; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#5b747b;">
            Recibes esto porque te suscribiste en privasmagazine.com ·
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#256585;">Darse de baja</a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;
}

function filaItem(titulo: string, href: string | null): string {
  return `
<tr>
  <td style="padding:16px 0; border-bottom:1px solid #e3ddc9;">
    <p style="margin:0 0 12px; font-family:Georgia,'Times New Roman',serif; font-size:17px; font-weight:700; color:#16323a; line-height:1.4;">
      ${titulo}
    </p>
    ${
      href
        ? `<a href="${href}" style="display:inline-block; padding:10px 22px; border-radius:8px; background-color:#256585; font-family:Arial,Helvetica,sans-serif; font-size:13px; font-weight:700; letter-spacing:0.02em; color:#fbf7ee; text-decoration:none;">Ve la publicación aquí →</a>`
        : ''
    }
  </td>
</tr>`;
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
      ...articulos.map((a) => filaItem(a.titulo, `${siteUrl}/articulos/${a.slug}`)),
      ...ediciones.map((e) => filaItem(`${e.titulo} — nueva edición de la revista`, `${siteUrl}/revistas`)),
    ].join('');

    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    const crear = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        audience_id: audienceId,
        from,
        subject: 'Novedades en PRIVAS Magazine',
        html: plantillaCorreo(items),
      }),
    });
    if (!crear.ok) {
      console.error(`Resend: crear broadcast falló: ${crear.status} ${await crear.text()}`);
      return { enviado: false, motivo: `Resend ${crear.status}` };
    }

    // POST /broadcasts solo lo deja como borrador — sin este segundo paso no
    // se manda a nadie (issue #64: así estaba antes y nunca llegaba nada).
    const { id } = await crear.json();
    const enviar = await fetch(`https://api.resend.com/broadcasts/${id}/send`, {
      method: 'POST',
      headers,
    });
    if (!enviar.ok) {
      console.error(`Resend: enviar broadcast falló: ${enviar.status} ${await enviar.text()}`);
      return { enviado: false, motivo: `Resend send ${enviar.status}` };
    }
    return { enviado: true };
  } catch (e) {
    console.error('Newsletter: error no fatal', e);
    return { enviado: false, motivo: String(e) };
  }
}
