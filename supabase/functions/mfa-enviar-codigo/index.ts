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
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;color:#16323a;max-width:420px;margin:0 auto;padding:24px;">
              <p>Tu código de verificación para entrar al panel de PRIVAS Magazine es:</p>
              <p style="font-size:32px;font-weight:700;letter-spacing:0.25em;color:#256585;margin:16px 0;">${codigo}</p>
              <p style="font-size:13px;color:#5b747b;">Vence en 10 minutos. Si no fuiste tú quien lo pidió, ignora este correo — tu cuenta sigue protegida por tu contraseña.</p>
            </div>`,
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
