import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Rutas exclusivas del `dueno` (hoy: Documentación). Igual que
 * `gestionAdminsGuard`, va junto con `adminGuard` en la ruta: quien no sea
 * dueño cae al dashboard, no a un error.
 */
export const duenoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.init();
  if (auth.esDueno()) return true;

  return router.createUrlTree([environment.adminBasePath, 'dashboard']);
};
