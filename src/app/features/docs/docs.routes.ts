import { Routes } from '@angular/router';
import { duenoGuard } from '../../core/auth/dueno.guard';

/**
 * Rutas de la documentación (issue #81). El guard se importa AQUÍ y no en
 * `app.routes.ts` a propósito: importarlo en la raíz metía Supabase en el
 * bundle inicial de todo el sitio público (311 kB → 531 kB). Quien no sea
 * dueño con sesión completa vuelve al landing `/` (ver `duenoGuard`).
 */
export const DOCS_ROUTES: Routes = [
  {
    path: '',
    title: 'Documentación · PRIVAS Magazine',
    canActivate: [duenoGuard],
    loadComponent: () => import('./documentacion').then((m) => m.Documentacion),
  },
];
