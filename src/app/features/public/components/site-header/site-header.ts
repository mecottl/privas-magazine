import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SECCIONES } from '../../../../core/models';

/**
 * Header fijo del sitio público + menú móvil. Se renderiza una vez desde
 * `PublicLayout`, que le pasa si la ruta actual dibuja un hero a sangre:
 *  - con hero, sin scroll → transparente sobre la foto
 *  - con hero, tras bajar → cristal líquido (`.is-glass`)
 *  - sin hero (páginas de texto) → teal sólido (`.is-solid`)
 */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** La ruta activa dibuja un hero a sangre detrás del header. Lo decide `PublicLayout`. */
  readonly conHero = input.required<boolean>();

  readonly secciones = SECCIONES;
  readonly menuAbierto = signal(false);
  /** Se ha bajado un poco: dispara el modo cristal líquido. */
  private readonly scrolled = signal(false);
  /** Sobre un hero, en cuanto se baja: header de cristal líquido. */
  readonly glass = computed(() => this.conHero() && this.scrolled());

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.menuAbierto.set(false));

    if (typeof window !== 'undefined') {
      // Comparación barata + signal con igualdad → sin rAF (que se pausa si la
      // pestaña está en segundo plano y dejaría el header pegado).
      const onScroll = () => this.scrolled.set(window.scrollY > 6);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    }
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }
}
