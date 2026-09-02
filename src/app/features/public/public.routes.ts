import { Routes } from '@angular/router';
import { PublicLayout } from './layout/public-layout';

/** Rutas del sitio público. Secciones según CLAUDE.md § Decisiones de frontend. */
export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'articulos',
        loadComponent: () =>
          import('./pages/articulos/articulos').then((m) => m.Articulos),
      },
      {
        path: 'articulos/:slug',
        loadComponent: () =>
          import('./pages/articulo-detalle/articulo-detalle').then(
            (m) => m.ArticuloDetalle,
          ),
      },
      {
        path: 'revistas',
        loadComponent: () =>
          import('./pages/revistas/revistas').then((m) => m.Revistas),
      },
      {
        path: 'marcas',
        loadComponent: () => import('./pages/marcas/marcas').then((m) => m.Marcas),
      },
      {
        path: 'aviso-de-privacidad',
        loadComponent: () =>
          import('./pages/aviso-privacidad/aviso-privacidad').then(
            (m) => m.AvisoPrivacidad,
          ),
      },
      {
        path: 'newsletter/confirmar',
        loadComponent: () =>
          import('./pages/newsletter/confirmar-suscripcion').then(
            (m) => m.ConfirmarSuscripcion,
          ),
      },
      {
        path: 'newsletter/cancelar',
        loadComponent: () =>
          import('./pages/newsletter/cancelar-suscripcion').then(
            (m) => m.CancelarSuscripcion,
          ),
      },
    ],
  },
];
