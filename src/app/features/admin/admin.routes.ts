import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin.guard';
import { AdminLayout } from './layout/admin-layout';

/** Rutas del panel de administración (protegidas por `adminGuard`). */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'articulos',
        loadComponent: () =>
          import('./pages/articulos/articulos-lista').then(
            (m) => m.ArticulosLista,
          ),
      },
      {
        path: 'articulos/nuevo',
        loadComponent: () =>
          import('./pages/articulos/articulo-editar').then(
            (m) => m.ArticuloEditar,
          ),
      },
      {
        path: 'articulos/:id',
        loadComponent: () =>
          import('./pages/articulos/articulo-editar').then(
            (m) => m.ArticuloEditar,
          ),
      },
      {
        path: 'ediciones',
        loadComponent: () =>
          import('./pages/ediciones/ediciones-lista').then(
            (m) => m.EdicionesLista,
          ),
      },
      {
        path: 'marcas',
        loadComponent: () =>
          import('./pages/marcas/marcas-lista').then((m) => m.MarcasLista),
      },
      {
        path: 'administradores',
        loadComponent: () =>
          import('./pages/administradores/administradores-lista').then(
            (m) => m.AdministradoresLista,
          ),
      },
    ],
  },
];
