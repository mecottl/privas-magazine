import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin.guard';
import { gestionAdminsGuard } from '../../core/auth/gestion-admins.guard';
import { duenoGuard } from '../../core/auth/dueno.guard';
import { AdminLayout } from './layout/admin-layout';

/** Rutas del panel de administración (protegidas por `adminGuard`). */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Acceso',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'aceptar-invitacion',
    title: 'Crea tu contraseña',
    loadComponent: () =>
      import('./pages/aceptar-invitacion/aceptar-invitacion').then(
        (m) => m.AceptarInvitacion,
      ),
  },
  {
    path: 'confirmar-invitacion',
    title: 'Confirma tu invitación',
    loadComponent: () =>
      import('./pages/confirmar-invitacion/confirmar-invitacion').then(
        (m) => m.ConfirmarInvitacion,
      ),
  },
  {
    path: 'verificar-mfa',
    title: 'Verificación en dos pasos',
    loadComponent: () =>
      import('./pages/verificar-mfa/verificar-mfa').then((m) => m.VerificarMfa),
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
        path: 'ediciones/nuevo',
        title: 'Nueva edición · Gestión',
        loadComponent: () =>
          import('./pages/ediciones/edicion-editar').then((m) => m.EdicionEditar),
      },
      {
        path: 'ediciones/:id',
        title: 'Editar edición · Gestión',
        loadComponent: () =>
          import('./pages/ediciones/edicion-editar').then((m) => m.EdicionEditar),
      },
      {
        path: 'marcas',
        title: 'Marcas · Gestión',
        loadComponent: () =>
          import('./pages/marcas/marcas-lista').then((m) => m.MarcasLista),
      },
      {
        path: 'marcas/nuevo',
        title: 'Nueva marca · Gestión',
        loadComponent: () =>
          import('./pages/marcas/marca-editar').then((m) => m.MarcaEditar),
      },
      {
        path: 'marcas/:id',
        title: 'Editar marca · Gestión',
        loadComponent: () =>
          import('./pages/marcas/marca-editar').then((m) => m.MarcaEditar),
      },
      {
        path: 'administradores',
        title: 'Administradores · Gestión',
        canActivate: [gestionAdminsGuard],
        loadComponent: () =>
          import('./pages/administradores/administradores-lista').then(
            (m) => m.AdministradoresLista,
          ),
      },
      {
        path: 'papelera',
        title: 'Papelera · Gestión',
        loadComponent: () =>
          import('./pages/papelera/papelera-lista').then((m) => m.PapeleraLista),
      },
      {
        path: 'bitacora',
        title: 'Bitácora · Gestión',
        canActivate: [gestionAdminsGuard],
        loadComponent: () =>
          import('./pages/bitacora/bitacora-lista').then((m) => m.BitacoraLista),
      },
      {
        path: 'documentacion',
        title: 'Documentación · Gestión',
        canActivate: [duenoGuard],
        loadComponent: () =>
          import('./pages/documentacion/documentacion').then((m) => m.Documentacion),
      },
      {
        path: 'configuracion',
        title: 'Configuración · Gestión',
        loadComponent: () =>
          import('./pages/configuracion/configuracion').then(
            (m) => m.Configuracion,
          ),
      },
    ],
  },
];
