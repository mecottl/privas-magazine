import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Protege las rutas del panel. Si no hay perfil de admin válido,
 * redirige al login oculto (`environment.adminBasePath`).
 */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.init();
  if (auth.esAdmin()) return true;

  return router.createUrlTree([environment.adminBasePath, 'login']);
};
