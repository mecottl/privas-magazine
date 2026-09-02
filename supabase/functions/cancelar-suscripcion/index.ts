/**
 * cancelar-suscripcion (CLAUDE.md § 5 · brief § 5)
 *
 * Pública. Baja individual: pone `activo = false` (NO borra la fila — así se
 * respeta la baja aunque reintenten confirmar con un token viejo, y no se le
 * vuelve a escribir sin que se resuscriba). Respuesta genérica siempre.
 */
import { actualizarEstadoSuscripcion } from '../_shared/suscripcion.ts';

Deno.serve((req) => actualizarEstadoSuscripcion(req, false));
