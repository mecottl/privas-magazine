/**
 * confirmar-suscripcion (CLAUDE.md § 5)
 * Doble opt-in: activa `activo = true` cuando el visitante hace clic en el
 * link de confirmación (?token=...). Público (sin JWT).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get('token');
  if (!token) return json({ error: 'Falta "token"' }, 400);

  const { data, error } = await adminClient()
    .from('suscriptores_newsletter')
    .update({ activo: true })
    .eq('token_confirmacion', token)
    .select('email')
    .maybeSingle();

  if (error || !data) return json({ error: 'Token inválido' }, 400);
  return json({ ok: true });
});
