import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Protege las rutas del panel. Si no hay perfil de admin válido,
 * redirige al login oculto (`environment.adminBasePath`).
 *
 * MFA por correo (issue #17): obligatorio para `dueno`, opcional y
 * autoactivable para el resto (`AuthService.mfaRequerido`). Si aplica y
 * este navegador no quedó "recordado" de una verificación reciente (30
 * días, ver `mfaEsDispositivoConfiable`), manda a pedir el código antes de
 * dejar pasar al panel.
 */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.init();
  if (!auth.esAdmin()) {
    return router.createUrlTree([environment.adminBasePath, 'login']);
  }

  if (auth.mfaRequerido() && !auth.mfaEsDispositivoConfiable()) {
    return router.createUrlTree([environment.adminBasePath, 'verificar-mfa']);
  }

  return true;
};
