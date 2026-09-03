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
          import('./pages/landing/landing').then((m) => m.Landing),
      },
      {
        path: 'articulos',
        title: 'Artículos',
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
        title: 'Ediciones de la revista',
        loadComponent: () =>
          import('./pages/revistas/revistas').then((m) => m.Revistas),
      },
      {
        path: 'marcas',
        title: 'Nuestras Marcas',
        loadComponent: () => import('./pages/marcas/marcas').then((m) => m.Marcas),
      },
      {
        path: 'aviso-de-privacidad',
        title: 'Aviso de Privacidad',
        loadComponent: () =>
          import('./pages/aviso-privacidad/aviso-privacidad').then(
            (m) => m.AvisoPrivacidad,
          ),
      },
      {
        path: 'newsletter/confirmar',
        title: 'Confirmar suscripción',
        loadComponent: () =>
          import('./pages/newsletter/confirmar-suscripcion').then(
            (m) => m.ConfirmarSuscripcion,
          ),
      },
      {
        path: 'newsletter/cancelar',
        title: 'Cancelar suscripción',
        loadComponent: () =>
          import('./pages/newsletter/cancelar-suscripcion').then(
            (m) => m.CancelarSuscripcion,
          ),
      },
      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: () =>
          import('./pages/no-encontrado/no-encontrado').then((m) => m.NoEncontrado),
      },
    ],
  },
];
