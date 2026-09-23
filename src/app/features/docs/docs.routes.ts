import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin.guard';
import { duenoGuard } from '../../core/auth/dueno.guard';

/**
 * Rutas de la documentación (issue #81). Los guards se importan AQUÍ y no en
 * `app.routes.ts` a propósito: importarlos en la raíz metía Supabase en el
 * bundle inicial de todo el sitio público (311 kB → 531 kB).
 */
export const DOCS_ROUTES: Routes = [
  {
    path: '',
    title: 'Documentación · PRIVAS Magazine',
    canActivate: [adminGuard, duenoGuard],
    loadComponent: () => import('./documentacion').then((m) => m.Documentacion),
  },
];
