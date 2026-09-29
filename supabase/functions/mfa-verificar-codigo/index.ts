/**
 * mfa-verificar-codigo (issue #17 — MFA propio por correo)
 *
 * Quién la llama: cualquier admin ya logueado, desde
 * `/gestion-privas/verificar-mfa`, al escribir el código de 6 dígitos.
 *
 * 1. requireAdmin con `exigirMfa: false` — verificar el MFA es exactamente
 *    lo que esta función hace; exigirlo primero sería un candado sin llave.
 * 2. Body: { codigo }.
 * 3. Busca el código MÁS RECIENTE de esa cuenta: debe coincidir, no estar
 *    usado, y no haber vencido.
 * 4. Si es válido, lo marca usado (un código sirve una sola vez), guarda
 *    `mfa_verificado_hasta` en el `user_metadata` de Auth (issue #85 —
 *    `requireAdmin` de las demás funciones lo exige) y 200 { ok: true }.
 *    El frontend decide aparte cuánto "recordar" el dispositivo en su propio
 *    localStorage (mismo número de días, ver `AuthService.MFA_RECORDAR_MS`).
 */
import { corsHeaders, fijarOrigenCors, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

interface Payload {
  codigo?: string;
}

/** Mismo valor que `AuthService.MFA_RECORDAR_MS` en el frontend — si se
 *  cambia uno, hay que cambiar el otro. */
const MFA_RECORDAR_MS = 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  fijarOrigenCors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const quienLlama = await requireAdmin(req, { exigirMfa: false });
    const { codigo } = (await req.json().catch(() => ({}))) as Payload;
    if (!codigo) return json({ error: 'Falta el código' }, 400);

    const admin = adminClient();
    const { data, error } = await admin
      .from('mfa_codigos')
      .select('id, expira_en, usado')
      .eq('admin_id', quienLlama.id)
      .eq('codigo', codigo.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return json({ error: error.message }, 400);

    if (!data || data.usado || new Date(data.expira_en) < new Date()) {
      return json({ error: 'Código inválido o vencido.' }, 400);
    }

    await admin.from('mfa_codigos').update({ usado: true }).eq('id', data.id);

    // issue #85: sin esto, requireAdmin no tiene forma de saber que esta
    // cuenta de verdad pasó el MFA — quedaría rechazando todo aunque el
    // frontend ya haya recordado el dispositivo localmente.
    await admin.auth.admin.updateUserById(quienLlama.id, {
      user_metadata: { mfa_verificado_hasta: Date.now() + MFA_RECORDAR_MS },
    });

    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
