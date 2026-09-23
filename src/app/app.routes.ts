import { Routes } from '@angular/router';

/**
 * Rutas raíz.
 *
 * - Sitio público: en la raíz.
 * - Panel de administración: bajo una ruta OCULTA (`gestion-privas`), sin
 *   link en la navegación pública (ver CLAUDE.md § Decisiones de frontend).
 *   Si cambias el segmento, actualiza también `environment.adminBasePath`.
 * - Documentación (`/documentacion`, issue #81): fuera del panel a propósito,
 *   con su propio layout de lectura. Solo dueño (sesión + MFA + nivel).
 */
export const routes: Routes = [
  {
    path: 'gestion-privas',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'documentacion',
    loadChildren: () =>
      import('./features/docs/docs.routes').then((m) => m.DOCS_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/public/public.routes').then((m) => m.PUBLIC_ROUTES),
  },
  // Cualquier ruta desconocida entra al sitio público y su `**` muestra el 404.
];
