/**
 * "Este dispositivo ya pasó el MFA hace poco" (issue #17) — en `localStorage`,
 * por eso NO es una función inyectable: la usan tanto `AuthService` como
 * `SupabaseService` (inyectar `AuthService` ahí crearía un ciclo, ya que
 * `AuthService` depende de `SupabaseService`).
 */
function clave(uid: string): string {
  return `privas-mfa-confiable:${uid}`;
}

/** ¿Este navegador ya pasó el MFA hace poco para esta cuenta? */
export function mfaEsDispositivoConfiable(uid: string): boolean {
  try {
    const hasta = Number(localStorage.getItem(clave(uid)) ?? '0');
    return hasta > Date.now();
  } catch {
    return false; // sin storage disponible, mejor pedir el código
  }
}

export function mfaMarcarDispositivoConfiable(uid: string, recordarMs: number): void {
  try {
    localStorage.setItem(clave(uid), String(Date.now() + recordarMs));
  } catch {
    /* si no hay storage, simplemente se volverá a pedir la próxima vez */
  }
}

/**
 * Issue #85: cuando una Edge Function responde "MFA requerido" (el backend
 * ya no confía en un valor recordado que él mismo no puede confirmar),
 * se olvida el dispositivo para que la próxima navegación pida el código de
 * verdad, en vez de reintentar en bucle contra algo que el servidor rechaza.
 */
export function mfaOlvidarDispositivo(uid: string): void {
  try {
    localStorage.removeItem(clave(uid));
  } catch {
    /* nada que limpiar */
  }
}
