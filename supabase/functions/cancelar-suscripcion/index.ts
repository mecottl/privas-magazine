/**
 * cancelar-suscripcion (CLAUDE.md § 5)
 * Baja individual por token (link "darse de baja" en cada correo). Público.
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get('token');
  if (!token) return json({ error: 'Falta "token"' }, 400);

  const { data, error } = await adminClient()
    .from('suscriptores_newsletter')
    .update({ activo: false })
    .eq('token_confirmacion', token)
    .select('email')
    .maybeSingle();

  if (error || !data) return json({ error: 'Token inválido' }, 400);
  return json({ ok: true });
});
