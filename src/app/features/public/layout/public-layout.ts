import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NewsletterForm } from '../pages/newsletter/newsletter-form';

interface Seccion {
  nombre: string;
  slug: string;
}

/**
 * Shell del sitio público: header fijo (transparente sobre el hero, teal al
 * hacer scroll o fuera de la portada), contenido, y pie de marca.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NewsletterForm],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    <header class="site-head" [class.is-glass]="glass()" [class.is-solid]="!esPortada()">
      <div class="site-head__inner">
        <a routerLink="/" class="brand" (click)="cerrarMenu()" aria-label="PRIVAS Magazine — inicio">
          <span class="brand__word">PRIVAS</span>
          <span class="brand__sub">magazine</span>
        </a>

        <nav class="site-nav" aria-label="Secciones">
          @for (s of secciones; track s.slug) {
            <a
              class="site-nav__link"
              routerLink="/articulos"
              [queryParams]="{ categoria: s.slug }"
              routerLinkActive="is-active"
            >{{ s.nombre }}</a>
          }
          <a class="site-nav__revista" routerLink="/revistas" routerLinkActive="is-active">La revista</a>
        </nav>

        <button
          type="button"
          class="nav-toggle"
          (click)="menuAbierto.set(!menuAbierto())"
          [attr.aria-expanded]="menuAbierto()"
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            @if (menuAbierto()) {
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            } @else {
              <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
            }
          </svg>
        </button>
      </div>
    </header>

    <div class="nav-sheet" [class.is-open]="menuAbierto()">
      @for (s of secciones; track s.slug) {
        <a routerLink="/articulos" [queryParams]="{ categoria: s.slug }" (click)="cerrarMenu()">{{ s.nombre }}</a>
      }
      <a routerLink="/revistas" (click)="cerrarMenu()">La revista</a>
      <a class="btn btn--crema nav-sheet__revista" routerLink="/" (click)="cerrarMenu()">Ir al inicio</a>
    </div>

    <main
      class="site-main"
      [class.site-main--flush]="esPortada()"
      id="contenido"
      tabindex="-1"
      #main
    >
      <router-outlet (activate)="alActivarRuta()" />
    </main>

    <footer class="site-foot">
      <div class="site-foot__grid">
        <div class="site-foot__brand">
          <p class="site-foot__word">PRIVAS<span>magazine</span></p>
          <p class="site-foot__tag">Una revista para los amantes de los viajes.</p>
          <div class="site-foot__redes-list">
            @for (r of redes; track r.nombre) {
              <a [href]="r.url" target="_blank" rel="noopener" [attr.aria-label]="r.nombre">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path [attr.d]="r.icono" />
                </svg>
              </a>
            }
          </div>
        </div>

        <nav class="foot-col" aria-label="Contacto">
          <span class="foot-col__label">Contacto</span>
          <a href="mailto:hola@privasmagazine.com">hola&#64;privasmagazine.com</a>
          <a href="tel:+529991067711">+52 999 106 7711</a>
          <a href="https://t.me/PRIVAS_MAGAZINE" target="_blank" rel="noopener">Telegram · PRIVAS_MAGAZINE</a>
          <a href="https://wa.me/529991067711" target="_blank" rel="noopener">WhatsApp</a>
        </nav>

        <nav class="foot-col" aria-label="Enlaces">
          <span class="foot-col__label">Explora</span>
          <a routerLink="/articulos">Artículos</a>
          <a routerLink="/revistas">Ediciones de la revista</a>
          <a href="mailto:hola@privasmagazine.com">Directorio y sobre nosotros</a>
          <a href="mailto:hola@privasmagazine.com">Socios y colaboradores</a>
        </nav>

        <div class="foot-col foot-col--news">
          <span class="foot-col__label">Boletín</span>
          <p class="foot-col__news-copy">Un aviso cuando publicamos algo nuevo.</p>
          <app-newsletter-form />
        </div>
      </div>

      <div class="site-foot__base">
        <span class="site-foot__grupo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke-linejoin="round" />
          </svg>
          Grupo Privas
        </span>
        <span class="site-foot__base-links">
          <a routerLink="/aviso-de-privacidad">Aviso de privacidad</a>
          <a routerLink="/aviso-de-privacidad">Términos y condiciones</a>
          <a href="mailto:hola@privasmagazine.com">Anúnciate con nosotros</a>
        </span>
        <span class="site-foot__copy">© {{ anio }} <b>PRIVAS Magazine</b> · Todos los derechos reservados</span>
      </div>
    </footer>
  `,
})
export class PublicLayout {
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly anio = new Date().getFullYear();
  readonly menuAbierto = signal(false);
  /** Se ha bajado un poco (dispara el modo cristal / encogido). */
  readonly scrolled = signal(false);
  readonly esPortada = signal(this.calcPortada(this.router.url));
  /** En la portada, en cuanto se baja: header de cristal líquido. */
  readonly glass = computed(() => this.esPortada() && this.scrolled());
  private primeraCarga = true;

  readonly secciones: Seccion[] = [
    { nombre: 'Turismo', slug: 'turismo' },
    { nombre: 'Gastronomía', slug: 'gastronomia' },
    { nombre: 'Cultura', slug: 'cultura' },
    { nombre: 'Arte', slug: 'arte' },
    { nombre: 'Entretenimiento', slug: 'entretenimiento' },
  ];

  /** SVG paths de los iconos sociales (24x24, fill). */
  readonly redes = [
    {
      nombre: 'Instagram',
      url: 'https://instagram.com/privasmagazine',
      icono:
        'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4a3.7 3.7 0 0 1-1.4-.9 3.7 3.7 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1a3.3 3.3 0 0 0-.8-1.3 3.3 3.3 0 0 0-1.3-.8c-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm5.1-3.3a1.2 1.2 0 1 1 0 2.3 1.2 1.2 0 0 1 0-2.3Z',
    },
    {
      nombre: 'X',
      url: 'https://x.com/privasmagazine',
      icono:
        'M17.5 3h3l-6.6 7.5L22 21h-6l-4.4-5.8L6.5 21h-3l7-8L2 3h6.2l4 5.3L17.5 3Zm-1 16h1.7L7.6 4.8H5.8L16.5 19Z',
    },
    {
      nombre: 'Facebook',
      url: 'https://facebook.com/privasmagazine',
      icono:
        'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z',
    },
    {
      nombre: 'TikTok',
      url: 'https://tiktok.com/@privasmagazine',
      icono:
        'M16.5 3c.3 2 1.5 3.7 3.5 4v2.6c-1.4 0-2.7-.4-3.8-1.1v6.9a6.4 6.4 0 1 1-6.4-6.4c.3 0 .7 0 1 .1v2.7a3.7 3.7 0 1 0 2.6 3.5V3h3.1Z',
    },
    {
      nombre: 'YouTube',
      url: 'https://youtube.com/@privasmagazine',
      icono:
        'M23 12s0-3.2-.4-4.7a3 3 0 0 0-2.1-2.1C18.9 4.7 12 4.7 12 4.7s-6.9 0-8.5.5A3 3 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3 3 0 0 0 2.1 2.1c1.6.5 8.5.5 8.5.5s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1C23 15.2 23 12 23 12ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z',
    },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        this.esPortada.set(this.calcPortada(e.urlAfterRedirects));
        this.menuAbierto.set(false);
      });

    if (typeof window !== 'undefined') {
      // Comparación barata + signals con igualdad → sin rAF (que se pausa si la
      // pestaña está en segundo plano y dejaría el header pegado).
      const onScroll = () => this.scrolled.set(window.scrollY > 32);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    }
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
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
