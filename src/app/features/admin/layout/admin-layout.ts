import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/** Shell del panel de administración: sidebar + contenido. */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <aside class="admin-sidebar">
      <strong>PRIVAS · Gestión</strong>
      <nav>
        <a routerLink="dashboard" routerLinkActive="active">Panel</a>
        <a routerLink="articulos" routerLinkActive="active">Artículos</a>
        <a routerLink="ediciones" routerLinkActive="active">Ediciones</a>
        <a routerLink="marcas" routerLinkActive="active">Marcas</a>
        <a routerLink="administradores" routerLinkActive="active">Administradores</a>
      </nav>
      <button type="button" (click)="salir()">Cerrar sesión</button>
    </aside>

    <main class="admin-main">
      <router-outlet />
    </main>
  `,
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  salir() {
    void this.auth.cerrarSesion();
  }
}
