import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin.guard';
import { AdminLayout } from './layout/admin-layout';

/** Rutas del panel de administración (protegidas por `adminGuard`). */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Acceso',
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
    title: 'Panel · Gestión',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'categorias',
    title: 'Categorías · Gestión',
        loadComponent: () =>
          import('./pages/categorias/categorias-lista').then(
            (m) => m.CategoriasLista,
          ),
      },
      {
        path: 'articulos',
    title: 'Artículos · Gestión',
        loadComponent: () =>
          import('./pages/articulos/articulos-lista').then(
            (m) => m.ArticulosLista,
          ),
      },
      {
        path: 'articulos/nuevo',
    title: 'Nuevo artículo · Gestión',
        loadComponent: () =>
          import('./pages/articulos/articulo-editar').then(
            (m) => m.ArticuloEditar,
          ),
      },
      {
        path: 'articulos/:id',
    title: 'Editar artículo · Gestión',
        loadComponent: () =>
          import('./pages/articulos/articulo-editar').then(
            (m) => m.ArticuloEditar,
          ),
      },
      {
        path: 'ediciones',
    title: 'Ediciones · Gestión',
        loadComponent: () =>
          import('./pages/ediciones/ediciones-lista').then(
            (m) => m.EdicionesLista,
          ),
      },
      {
        path: 'marcas',
    title: 'Marcas · Gestión',
        loadComponent: () =>
          import('./pages/marcas/marcas-lista').then((m) => m.MarcasLista),
      },
      {
        path: 'administradores',
    title: 'Administradores · Gestión',
        loadComponent: () =>
          import('./pages/administradores/administradores-lista').then(
            (m) => m.AdministradoresLista,
          ),
      },
    ],
  },
];
