/**
 * suscribirse (CLAUDE.md → tabla de Edge Functions · brief → suscribirse)
 *
 * Pública. Reemplaza el INSERT directo del frontend a
 * `suscriptores_newsletter` — esa policy pública se cerró (ver migración
 * `20260905000000_cerrar_insert_publico_newsletter.sql`) precisamente para
 * poder aplicar rate limiting antes de escribir cualquier fila.
 *
 * Body: `{ email }`. 5 intentos por IP cada 10 minutos (issue #15).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/clients.ts';
import { dentroDelLimite, ipDeRequest } from '../_shared/rate_limit.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { error } = await adminClient()
    .from('suscriptores_newsletter')
    .insert({ email });

  if (error) {
    if (error.code === '23505') {
      return json({ error: 'Ese correo ya está registrado.' }, 409);
    }
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
