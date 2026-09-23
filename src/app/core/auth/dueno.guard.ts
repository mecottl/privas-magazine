import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Rutas exclusivas del `dueno` (hoy: `/documentacion`). Es autosuficiente, no
 * se combina con `adminGuard` a propósito: quien no tenga una sesión de dueño
 * completa (sesión + nivel + MFA ya verificado en este dispositivo) vuelve al
 * landing `/`, sin pasar por el login ni el dashboard — así la ruta no revela
 * que hay un panel detrás.
 */
export const duenoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.init();
  const completo =
    auth.esDueno() && (!auth.mfaRequerido() || auth.mfaEsDispositivoConfiable());
  return completo ? true : router.createUrlTree(['/']);
};
