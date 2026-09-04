/**
 * cancelar-suscripcion (CLAUDE.md → tabla de Edge Functions · brief → cancelar-suscripcion)
 *
 * Pública. Baja individual: pone `activo = false` (NO borra la fila — así se
 * respeta la baja aunque reintenten confirmar con un token viejo, y no se le
 * vuelve a escribir sin que se resuscriba). Respuesta genérica siempre.
 */
import { actualizarEstadoSuscripcion } from '../_shared/suscripcion.ts';

Deno.serve((req) => actualizarEstadoSuscripcion(req, false));
