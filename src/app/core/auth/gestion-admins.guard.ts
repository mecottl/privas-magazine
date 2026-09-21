import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Protege rutas que solo `admin_total` y `dueno` pueden ver (hoy:
 * Administradores). Se combina con `adminGuard` en la ruta (adminGuard ya
 * corrió como guard del padre `''`, así que aquí ya hay perfil cargado) —
 * un `editor` autenticado que intente entrar por URL directa cae al
 * dashboard, no a un error ni al login. Dentro de la pantalla, cada acción
 * se sigue afinando por nivel exacto (ver `set-admin-activo`).
 */
export const gestionAdminsGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.init();
  if (auth.tieneAccesoTotal()) return true;

  return router.createUrlTree([environment.adminBasePath, 'dashboard']);
};
