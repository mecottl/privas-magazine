
import { actualizarEstadoSuscripcion } from '../_shared/suscripcion.ts';

Deno.serve((req) => actualizarEstadoSuscripcion(req, true));
