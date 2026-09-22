import { adminClient } from './clients.ts';

/**
 * Registra una fila en `bitacora_admin` (issue #76). No fatal: un fallo
 * aquí nunca debe tumbar la acción real que se está auditando.
 */
export async function registrarBitacora(opts: {
  adminId: string;
  adminNombre?: string | null;
  accion: string;
  tabla?: string;
  registroId?: string;
  detalle?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await adminClient().from('bitacora_admin').insert({
      admin_id: opts.adminId,
      admin_nombre: opts.adminNombre ?? null,
      accion: opts.accion,
      tabla: opts.tabla ?? null,
      registro_id: opts.registroId ?? null,
      detalle: opts.detalle ?? {},
    });
    if (error) console.error('registrarBitacora: no se pudo insertar', error);
  } catch (e) {
    console.error('registrarBitacora: error no fatal', e);
  }
}
