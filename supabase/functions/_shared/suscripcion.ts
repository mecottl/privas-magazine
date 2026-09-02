import { corsHeaders, json } from './cors.ts';
import { adminClient } from './clients.ts';

/**
 * Lógica compartida de confirmar/cancelar suscripción (brief § 4 y § 5).
 *
 * Públicas por diseño: no requieren sesión, pero SÍ un `token_confirmacion`
 * válido en query param `?token=` o en el body JSON `{ "token": "..." }`.
 *
 * Respuesta SIEMPRE genérica: nunca revela si un email concreto está o no
 * suscrito (evita usar el endpoint para enumerar correos).
 */
export function leerToken(req: Request, body: Record<string, unknown>): string | null {
  const url = new URL(req.url);
  const t = url.searchParams.get('token') ?? (body['token'] as string | undefined);
  return t && t.trim() ? t.trim() : null;
}

export async function actualizarEstadoSuscripcion(
  req: Request,
  activo: boolean,
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const token = leerToken(req, body as Record<string, unknown>);
  const RESPUESTA_GENERICA = { ok: true, mensaje: 'Enlace procesado.' };

  if (!token) {
    return json({ error: 'Falta el token' }, 400);
  }

  const supabase = adminClient(); // la tabla no permite SELECT público

  const { data: fila } = await supabase
    .from('suscriptores_newsletter')
    .select('id')
    .eq('token_confirmacion', token)
    .maybeSingle();

  // Token inexistente → misma respuesta genérica, sin confirmar ni negar.
  if (!fila) return json(RESPUESTA_GENERICA);

  await supabase
    .from('suscriptores_newsletter')
    .update({ activo })
    .eq('id', fila.id);

  return json(RESPUESTA_GENERICA);
}
