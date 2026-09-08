import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet, Scroll } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    const router = inject(Router);
    const scroller = inject(ViewportScroller);

    // Gestión de scroll a mano (withInMemoryScrolling va en 'disabled'):
    //  - volver atrás / adelante → restaura la posición guardada
    //  - enlace a #ancla → salta al ancla
    //  - cambio de página real → sube al inicio
    //  - misma ruta, solo cambia el query (?categoria= de /articulos) → NO se
    //    toca el scroll, para no perder de vista la rejilla al filtrar
    let rutaPrevia = typeof location !== 'undefined' ? location.pathname : '/';

    router.events
      .pipe(
        filter((e): e is Scroll => e instanceof Scroll),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const url =
          e.routerEvent instanceof NavigationEnd
            ? e.routerEvent.urlAfterRedirects
            : e.routerEvent.url;
        const ruta = url.split(/[?#]/)[0];

        if (e.position) {
          scroller.scrollToPosition(e.position);
        } else if (e.anchor) {
          scroller.scrollToAnchor(e.anchor);
        } else if (ruta !== rutaPrevia) {
          scroller.scrollToPosition([0, 0]);
        }

        rutaPrevia = ruta;
      });
  }
}
