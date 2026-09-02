import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Shell del sitio público: navbar + contenido + footer.
 * El footer DEBE incluir el link visible a "Aviso de Privacidad"
 * (obligatorio: se recolectan correos para el newsletter — ver CLAUDE.md).
 * NO incluye ningún link al panel de administración.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <a routerLink="/" class="brand">PRIVAS Magazine</a>
      <nav>
        <a routerLink="/articulos" routerLinkActive="active">Artículos</a>
        <a routerLink="/revistas" routerLinkActive="active">Revistas</a>
        <a routerLink="/marcas" routerLinkActive="active">Marcas</a>
      </nav>
    </header>

    <main class="site-main">
      <router-outlet />
    </main>

    <footer class="site-footer">
      <p>© {{ anio }} PRIVAS Magazine</p>
      <a routerLink="/aviso-de-privacidad">Aviso de Privacidad</a>
    </footer>
  `,
})
export class PublicLayout {
  readonly anio = new Date().getFullYear();
}
