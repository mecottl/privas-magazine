/**
 * mfa-enviar-codigo (issue #17 — MFA propio por correo)
 *
 * Quién la llama: cualquier admin ya logueado (con password), desde
 * `/gestion-privas/verificar-mfa`, al cargar la pantalla o al pedir
 * "reenviar código".
 *
 * 1. requireAdmin (admin activo).
 * 2. Invalida cualquier código previo sin usar de esa cuenta (para que solo
 *    el último enviado sirva — evita confusión si pide varios seguidos).
 * 3. Genera un código de 6 dígitos, vence en 10 min, se guarda en
 *    `mfa_codigos` con `service_role`.
 * 4. Lo manda por correo con la API de Resend (no vía Supabase Auth — este
 *    no es un correo de su sistema de invitación/recuperación).
 * 5. 200 { ok: true } — sin revelar el código en la respuesta.
 *
 * Secretos: RESEND_API_KEY, MFA_EMAIL_FROM (default
 * "PRIVAS Magazine <contacto@privasmagazine.com>").
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

/**
 * Mismo lenguaje visual que `docs/email-invitacion.html` (cabecera teal +
 * PRIVAS, cuerpo crema) — issue #63. A diferencia de esa plantilla, esta no
 * se pega en el dashboard de Supabase: se manda directo por la API de
 * Resend desde este archivo, así que vive aquí en vez de en /docs.
 */
function plantillaCorreo(codigo: string): string {
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
              Tu código de verificación
            </h1>
            <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#2c4a52;">
              Escríbelo en la pantalla de verificación para entrar al panel de PRIVAS Magazine:
            </p>

            <div style="display:inline-block; padding:14px 30px; border-radius:12px; background-color:#edeae1; font-family:Arial,Helvetica,sans-serif; font-size:34px; font-weight:700; letter-spacing:0.3em; color:#256585;">
              ${codigo}
            </div>

            <p style="margin:24px 0 0; font-size:13px; line-height:1.5; color:#5b747b;">
              Vence en 10 minutos. Si no fuiste tú quien lo pidió, ignora este correo —
              tu cuenta sigue protegida por tu contraseña.
            </p>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:18px 32px; border-top:1px solid #cec5ac; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#5b747b;">
            Este código es personal — nunca lo compartas con nadie.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const quienLlama = await requireAdmin(req);
    const admin = adminClient();

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira_en = new Date(Date.now() + 10 * 60_000).toISOString();

    await admin
      .from('mfa_codigos')
      .update({ usado: true })
      .eq('admin_id', quienLlama.id)
      .eq('usado', false);

    const { error: errInsert } = await admin
      .from('mfa_codigos')
      .insert({ admin_id: quienLlama.id, codigo, expira_en });
    if (errInsert) return json({ error: errInsert.message }, 400);

    const { data: userData, error: errUser } = await admin.auth.admin.getUserById(
      quienLlama.id,
    );
    if (errUser || !userData.user?.email) {
      return json({ error: 'No se encontró el correo de la cuenta' }, 400);
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (apiKey) {
      const from = Deno.env.get('MFA_EMAIL_FROM') ?? 'PRIVAS Magazine <contacto@privasmagazine.com>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: userData.user.email,
          subject: `${codigo} — tu código para entrar a PRIVAS`,
          html: plantillaCorreo(codigo),
        }),
      });
      if (!res.ok) {
        console.error(`Resend falló al mandar código MFA: ${res.status} ${await res.text()}`);
        return json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' }, 502);
      }
    } else {
      // Sin RESEND_API_KEY (entorno sin dominio todavía): no truena, pero
      // avisa — nadie va a poder verificar sin el código.
      console.error('mfa-enviar-codigo: RESEND_API_KEY ausente, no se mandó el correo');
      return json({ error: 'El envío de correo no está configurado.' }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
