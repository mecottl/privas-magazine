import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { TitleStrategy } from '@angular/router';
import { routes } from './app.routes';
import { PrivasTitleStrategy } from './core/title-strategy';

registerLocaleData(localeEs, 'es');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // El scroll lo gobierna `App` a mano (ver app.ts): sube al inicio solo
      // cuando cambia la página de verdad, no cuando solo cambia el
      // ?categoria= de /articulos. Aquí solo dejamos vivo el saltar a #anclas.
      withInMemoryScrolling({
        scrollPositionRestoration: 'disabled',
        anchorScrolling: 'enabled',
      }),
    ),
    { provide: TitleStrategy, useClass: PrivasTitleStrategy },
    // Sin app initializer de auth: el sitio público no necesita Supabase al
    // arrancar (así queda fuera del bundle inicial). `adminGuard` ya llama a
    // `AuthService.init()` —idempotente— antes de activar el panel.
  ],
};
