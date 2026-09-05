import { adminClient } from './clients.ts';

/**
 * Rate limiting básico para Edge Functions públicas (issue #15).
 *
 * Cuenta intentos en `intentos_publicos` por `ruta` + `identificador` dentro
 * de una ventana de tiempo. No es a prueba de balas (un atacante con muchas
 * IPs lo rodea), pero frena el abuso trivial de un endpoint público sin
 * sesión (fuerza bruta de tokens, spam de altas de correo).
 */

/** Primera IP de `x-forwarded-for`, o 'desconocida' si no viene la cabecera. */
export function ipDeRequest(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'desconocida';
  const primera = xff.split(',')[0]?.trim();
  return primera || 'desconocida';
}

/**
 * `true` si `identificador` lleva menos de `limite` intentos en `ruta`
 * durante los últimos `ventanaMin` minutos (y registra este intento).
 * `false` si ya alcanzó el límite (NO registra un intento de más).
 *
 * Si la consulta de conteo falla (problema nuestro, no del llamador) se deja
 * pasar la solicitud — un rate limiter caído no debe tumbar el endpoint — y
 * se registra el error para enterarnos.
 */
export async function dentroDelLimite(
  ruta: string,
  identificador: string,
  limite: number,
  ventanaMin: number,
): Promise<boolean> {
  const supabase = adminClient();
  const desde = new Date(Date.now() - ventanaMin * 60_000).toISOString();

  const { count, error } = await supabase
    .from('intentos_publicos')
    .select('id', { count: 'exact', head: true })
    .eq('ruta', ruta)
    .eq('identificador', identificador)
    .gte('creado_en', desde);

  if (error) {
    console.error('dentroDelLimite: error al contar intentos', error);
    return true;
  }

  if ((count ?? 0) >= limite) return false;

  const { error: errInsert } = await supabase
    .from('intentos_publicos')
    .insert({ ruta, identificador });
  if (errInsert) {
    console.error('dentroDelLimite: error al registrar el intento', errInsert);
  }

  return true;
}
