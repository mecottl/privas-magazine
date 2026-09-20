import {
  ApplicationConfig,
  LOCALE_ID,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideServiceWorker } from '@angular/service-worker';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
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
      // Reemplaza el fade manual por clase (.ruta-entrando, ya quitado) por
      // la View Transitions API nativa. prefers-reduced-motion se respeta en
      // src/styles/_motion.scss (los pseudo-elementos ::view-transition-*
      // no los cubre el wildcard `*` normal, por eso llevan su propia regla).
      withViewTransitions(),
    ),
    { provide: TitleStrategy, useClass: PrivasTitleStrategy },
    // Sin app initializer de auth: el sitio público no necesita Supabase al
    // arrancar (así queda fuera del bundle inicial). `adminGuard` ya llama a
    // `AuthService.init()` —idempotente— antes de activar el panel.
    // PWA (issue #48): instalable + cache offline de PDFs de revista ya
    // descargados (ver ngsw-config.json). Se registra 30s después de que la
    // app queda estable, para no competir con la carga inicial.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
