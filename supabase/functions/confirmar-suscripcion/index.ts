/**
 * confirmar-suscripcion (CLAUDE.md → tabla de Edge Functions · brief → confirmar-suscripcion)
 *
 * Pública. Doble opt-in: pone `activo = true` en la fila cuyo
 * `token_confirmacion` coincide. Respuesta genérica siempre (no revela si un
 * email está suscrito). El mensaje visible lo pinta Angular en la ruta
 * pública /newsletter/confirmar.
 */
import { actualizarEstadoSuscripcion } from '../_shared/suscripcion.ts';

Deno.serve((req) => actualizarEstadoSuscripcion(req, true));
