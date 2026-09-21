import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Protege rutas que solo `admin_total` puede ver (hoy: Administradores).
 * Se combina con `adminGuard` en la ruta (adminGuard ya corrió como guard
 * del padre `''`, así que aquí ya hay perfil cargado) — un `editor`
 * autenticado que intente entrar por URL directa cae al dashboard, no a
 * un error ni al login.
 */
export const adminTotalGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.init();
  if (auth.esAdminTotal()) return true;

  return router.createUrlTree([environment.adminBasePath, 'dashboard']);
};
