/**
 * obtener-articulo-preview (issue #75 — vista previa de borrador)
 *
 * Pública, sin sesión — el "acceso" es el propio token de la URL, generado
 * al crear/editar el artículo (`articulos.token_preview`). Sirve para que
 * la clienta revise un artículo en borrador/programado antes de publicarlo,
 * sin necesitar cuenta de admin.
 *
 * A propósito NO hay una policy de RLS pública para esto — el token se
 * valida aquí, en código, con `service_role`, en vez de abrir una policy
 * de lectura pública adicional sobre `articulos`.
 *
 * Body: `{ token }`. Rate limit 20/10min por IP (igual de generoso que un
 * link que se comparte varias veces, pero frena fuerza bruta trivial).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/clients.ts';
import { dentroDelLimite, ipDeRequest } from '../_shared/rate_limit.ts';

const SELECT_CON_CATEGORIAS =
  '*, categorias:categorias!articulos_categorias(id, nombre, slug)';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const dentro = await dentroDelLimite('obtener-articulo-preview', ipDeRequest(req), 20, 10);
  if (!dentro) {
    return json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const token =
    typeof (body as Record<string, unknown>)?.['token'] === 'string'
      ? ((body as Record<string, unknown>)['token'] as string).trim()
      : '';
  if (!token) return json({ error: 'Falta el token' }, 400);

  // Cualquier error (incluye "invalid input syntax for uuid" si el token no
  // es un UUID válido) se trata igual que "no encontrado" — no hay razón
  // para exponerle a un visitante público el detalle interno de Postgres.
  const { data } = await adminClient()
    .from('articulos')
    .select(SELECT_CON_CATEGORIAS)
    .eq('token_preview', token)
    .maybeSingle();

  if (!data) return json({ error: 'Vista previa no encontrada o el link ya no es válido.' }, 404);

  return json({ articulo: data });
});
