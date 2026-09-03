import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page">
      <h1>Panel</h1>
      <p>Sesión: {{ auth.perfil()?.nombre_visible || auth.user()?.email }}</p>
      <ul class="cards">
        <li><a routerLink="../categorias">Categorías</a></li>
        <li><a routerLink="../articulos">Artículos</a></li>
        <li><a routerLink="../ediciones">Ediciones de revista</a></li>
        <li><a routerLink="../marcas">Marcas</a></li>
        <li><a routerLink="../administradores">Administradores</a></li>
      </ul>
    </section>
  `,
})
export class Dashboard {
  readonly auth = inject(AuthService);
}
