import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Shell del sitio público: masthead de portada + barra de navegación pegajosa
 * + contenido + pie. Sin ningún enlace al panel de administración.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    <header class="masthead">
      <div class="masthead__top">
        <span>{{ hoy | date: 'fullDate' }}</span>
        <span>Península de Yucatán</span>
      </div>
      <a routerLink="/" class="masthead__wordmark">PRIVAS MAGAZINE</a>
      <p class="masthead__lema">
        Turismo · Gastronomía · Arte · Cultura · Entretenimiento
      </p>
    </header>

    <nav class="navbar" [class.navbar--abierto]="navAbierto()" aria-label="Principal">
      <div class="navbar__inner">
        <a routerLink="/" class="navbar__marca" (click)="cerrar()">PRIVAS</a>

        <button
          type="button"
          class="navbar__toggle"
          (click)="navAbierto.set(!navAbierto())"
          [attr.aria-expanded]="navAbierto()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            @if (navAbierto()) {
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            } @else {
              <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
            }
          </svg>
          {{ navAbierto() ? 'Cerrar' : 'Menú' }}
        </button>

        <ul class="navbar__links">
          <li>
            <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }" (click)="cerrar()">Inicio</a>
          </li>
          <li><a routerLink="/articulos" routerLinkActive="is-active" (click)="cerrar()">Artículos</a></li>
          <li><a routerLink="/revistas" routerLinkActive="is-active" (click)="cerrar()">Revistas</a></li>
          <li><a routerLink="/marcas" routerLinkActive="is-active" (click)="cerrar()">Nuestras Marcas</a></li>
        </ul>
      </div>
    </nav>

    <main class="site-main" id="contenido" tabindex="-1" #main>
      <router-outlet (activate)="alActivarRuta()" />
    </main>

    <footer class="site-footer">
      <div class="site-footer__marca">
        <p class="site-footer__wordmark">PRIVAS MAGAZINE</p>
        <p>Revista digital de la península de Yucatán.</p>
      </div>
      <nav class="site-footer__nav" aria-label="Pie">
        <a routerLink="/articulos">Artículos</a>
        <a routerLink="/revistas">Revistas</a>
        <a routerLink="/marcas">Nuestras Marcas</a>
        <a routerLink="/aviso-de-privacidad">Aviso de Privacidad</a>
      </nav>
      <p class="site-footer__legal">
        © {{ anio }} PRIVAS Magazine. Todos los derechos reservados.
      </p>
    </footer>
  `,
})
export class PublicLayout {
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  readonly hoy = new Date();
  readonly anio = this.hoy.getFullYear();
  readonly navAbierto = signal(false);
  private primeraCarga = true;

  cerrar() {
    this.navAbierto.set(false);
  }

  /** Tras navegar: aparición del contenido y foco al <main> (lectores de pantalla). */
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
