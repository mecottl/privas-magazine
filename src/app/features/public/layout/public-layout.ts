import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { SiteHeader } from '../components/site-header/site-header';
import { SiteFooter } from '../components/site-footer/site-footer';

/**
 * Cascarón del sitio público: header fijo (`app-site-header`), contenido
 * enrutado y pie (`app-site-footer`). Su única responsabilidad es saber si la
 * ruta actual dibuja un hero a sangre (`data.hero` en las rutas): en ese caso
 * el contenido va bajo el header y éste arranca transparente / cristal; si no,
 * el header es teal sólido y el contenido deja hueco para él.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** La ruta activa dibuja un hero a sangre detrás del header. */
  readonly conHero = signal(this.rutaConHero());
  private primeraCarga = true;

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.conHero.set(this.rutaConHero()));
  }

  /** ¿Hay `data: { hero: true }` en algún tramo de la ruta activa? */
  private rutaConHero(): boolean {
    let r: ActivatedRouteSnapshot | undefined = this.router.routerState.snapshot.root;
    while (r) {
      if (r.data?.['hero']) return true;
      r = r.firstChild ?? undefined;
    }
    return false;
  }

  alActivarRuta() {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return;
    }
    const el = this.main()?.nativeElement;
    if (!el) return;
    el.classList.remove('ruta-entrando');
    void el.offsetWidth;
    el.classList.add('ruta-entrando');
    el.focus({ preventScroll: true });
  }
}
