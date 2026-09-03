import {
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/** Shell del panel de administración: sidebar (marca + navegación + sesión) + contenido. */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <aside class="admin-sidebar">
      <div class="admin-sidebar__brand">
        <strong>PRIVAS</strong>
        <span>Gestión</span>
      </div>

      <nav>
        <a routerLink="dashboard" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h7V4H4zM13 20h7V4h-7zM4 20h7v-5H4z" stroke-linejoin="round"/></svg>
          Panel
        </a>
        <a routerLink="articulos" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5zM9 9h7M9 13h7M9 17h4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Artículos
        </a>
        <a routerLink="categorias" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke-linecap="round"/></svg>
          Categorías
        </a>
        <a routerLink="ediciones" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6zM6 4 4 6v14h12" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Ediciones
        </a>
        <a routerLink="marcas" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" stroke-linejoin="round"/></svg>
          Marcas
        </a>
        <a routerLink="administradores" routerLinkActive="active">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19v-2a4 4 0 0 0-8 0v2M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Administradores
        </a>
      </nav>

      <div class="admin-sidebar__foot">
        <p>{{ auth.perfil()?.nombre_visible || auth.user()?.email }}</p>
        <button type="button" class="secundario" (click)="salir()">Cerrar sesión</button>
      </div>
    </aside>

    <main class="admin-main" id="contenido" tabindex="-1" #main>
      <router-outlet (activate)="alActivarRuta()" />
    </main>
  `,
})
export class AdminLayout {
  readonly auth = inject(AuthService);
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private primeraCarga = true;

  salir() {
    void this.auth.cerrarSesion();
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
