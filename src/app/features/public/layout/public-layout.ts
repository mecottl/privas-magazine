import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SiteHeader } from '../components/site-header/site-header';
import { SiteFooter } from '../components/site-footer/site-footer';

/**
 * Cascarón del sitio público: header fijo (`app-site-header`), contenido
 * enrutado y pie (`app-site-footer`). Solo se ocupa de saber si la ruta
 * actual es la portada (el hero va a sangre y el header arranca transparente).
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

  readonly esPortada = signal(this.calcPortada(this.router.url));
  private primeraCarga = true;

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.esPortada.set(this.calcPortada(e.urlAfterRedirects)));
  }

  private calcPortada(url: string): boolean {
    return url === '/' || url.startsWith('/?') || url.startsWith('/#');
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
