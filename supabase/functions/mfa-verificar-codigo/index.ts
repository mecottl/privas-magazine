/**
 * mfa-verificar-codigo (issue #17 — MFA propio por correo)
 *
 * Quién la llama: cualquier admin ya logueado, desde
 * `/gestion-privas/verificar-mfa`, al escribir el código de 6 dígitos.
 *
 * 1. requireAdmin (admin activo).
 * 2. Body: { codigo }.
 * 3. Busca el código MÁS RECIENTE de esa cuenta: debe coincidir, no estar
 *    usado, y no haber vencido.
 * 4. Si es válido, lo marca usado (un código sirve una sola vez) y 200
 *    { ok: true }. El frontend es quien decide cuánto "recordar" el
 *    dispositivo (localStorage) — esta función no sabe nada de eso.
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

interface Payload {
  codigo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const quienLlama = await requireAdmin(req);
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
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
