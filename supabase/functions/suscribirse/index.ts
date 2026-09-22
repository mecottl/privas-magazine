/**
 * suscribirse (CLAUDE.md → tabla de Edge Functions · brief → suscribirse)
 *
 * Pública. Reemplaza el INSERT directo del frontend a
 * `suscriptores_newsletter` — esa policy pública se cerró (ver migración
 * `20260905000000_cerrar_insert_publico_newsletter.sql`) precisamente para
 * poder aplicar rate limiting antes de escribir cualquier fila.
 *
 * Body: `{ email }`. 5 intentos por IP cada 10 minutos (issue #15).
 *
 * Issue #64: el doble opt-in nunca funcionaba de punta a punta porque esta
 * función solo insertaba la fila — nadie recibía el correo con el link de
 * `confirmar-suscripcion`. Ahora lo manda por Resend (tolerante: si
 * RESEND_API_KEY falta, la suscripción se guarda igual pero se loguea).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/clients.ts';
import { dentroDelLimite, ipDeRequest } from '../_shared/rate_limit.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function plantillaCorreo(linkConfirmacion: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#edeae1; padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="420" cellpadding="0" cellspacing="0" style="max-width:420px; width:100%; background-color:#f7f2e7; border-radius:12px; overflow:hidden;">

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
          <td align="center" style="padding:36px 32px 28px; font-family:Arial,Helvetica,sans-serif; color:#16323a;">
            <h1 style="margin:0 0 14px; font-family:Georgia,'Times New Roman',serif; font-size:20px; font-weight:700; color:#256585;">
              Confirma tu suscripción
            </h1>
            <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#2c4a52;">
              Un último paso para recibir las novedades de PRIVAS Magazine en tu correo:
            </p>

            <a href="${linkConfirmacion}" style="display:inline-block; padding:14px 30px; border-radius:10px; background-color:#256585; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:700; color:#fbf7ee; text-decoration:none;">
              Confirmar suscripción
            </a>

            <p style="margin:24px 0 0; font-size:13px; line-height:1.5; color:#5b747b;">
              Si no fuiste tú quien lo pidió, ignora este correo, no pasa nada más.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;
}

async function enviarCorreoConfirmacion(email: string, token: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.error('suscribirse: RESEND_API_KEY ausente, no se mandó el correo de confirmación');
    return;
  }
  try {
    const from = Deno.env.get('NEWSLETTER_FROM') ?? 'PRIVAS Magazine <news@privasmagazine.com>';
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://privasmagazine.com';
    const link = `${siteUrl}/newsletter/confirmar?token=${token}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Confirma tu suscripción a PRIVAS Magazine',
        html: plantillaCorreo(link),
      }),
    });
    if (!res.ok) {
      console.error(`suscribirse: Resend falló al mandar la confirmación: ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.error('suscribirse: error no fatal al mandar el correo de confirmación', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const dentro = await dentroDelLimite('suscribirse', ipDeRequest(req), 5, 10);
  if (!dentro) {
    return json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const email =
    typeof (body as Record<string, unknown>)?.['email'] === 'string'
      ? ((body as Record<string, unknown>)['email'] as string).trim().toLowerCase()
      : '';

  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Correo inválido' }, 400);
  }

  const { data: fila, error } = await adminClient()
    .from('suscriptores_newsletter')
    .insert({ email })
    .select('token_confirmacion')
    .single();

  if (error) {
    if (error.code === '23505') {
      return json({ error: 'Ese correo ya está registrado.' }, 409);
    }
    return json({ error: error.message }, 500);
  }

  await enviarCorreoConfirmacion(email, fila.token_confirmacion);

  return json({ ok: true });
});
