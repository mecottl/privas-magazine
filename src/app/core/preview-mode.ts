/**
 * Modo vista previa del sitio público estando logueado (issue #82).
 *
 * Es solo una bandera en `sessionStorage` (muere al cerrar la pestaña): la
 * activa el link "Ver el sitio" del panel y la lee el layout público para
 * mostrar la barra de "Modo vista previa". No concede ningún permiso ni
 * cambia lo que se ve: el sitio se muestra exactamente como lo ve el público.
 * Distinto de la vista previa de borradores por token (issue #75).
 */
const CLAVE = 'privas-modo-preview';

export function modoPreviewActivo(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function activarModoPreview(): void {
  try {
    sessionStorage.setItem(CLAVE, '1');
  } catch {
    /* sin storage: el sitio se abre igual, solo sin la barra */
  }
}

export function salirModoPreview(): void {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    /* idem */
  }
}
