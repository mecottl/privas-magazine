import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CategoriasService } from '../../../core/services/categorias.service';
import type { Categoria } from '../../../core/models';

/**
 * Shell del sitio público: masthead + contenido + footer.
 * El footer DEBE incluir el link visible a "Aviso de Privacidad"
 * (obligatorio: se recolectan correos para el newsletter — ver CLAUDE.md).
 * NO incluye ningún link al panel de administración.
 *
 * El "kicker" (línea de categorías bajo el wordmark) se arma con las categorías
 * REALES (mismo `CategoriasService` que usan inicio/articulos): si la clienta
 * agrega una categoría desde el panel, aparece sola aquí. Cada una enlaza a
 * `/articulos?categoria=<slug>`.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="masthead">
      <div class="masthead-bar">
        <div class="masthead-identidad">
          <a routerLink="/" class="brand">PRIVAS Magazine</a>
          @if (categorias().length) {
            <p class="masthead-kicker">
              @for (c of categorias(); track c.id) {
                <a
                  routerLink="/articulos"
                  [queryParams]="{ categoria: c.slug }"
                  (click)="navAbierto.set(false)"
                  >{{ c.nombre }}</a
                >
              }
            </p>
          }
        </div>

        <button
          type="button"
          class="nav-toggle"
          (click)="navAbierto.set(!navAbierto())"
          [attr.aria-expanded]="navAbierto()"
        >
          {{ navAbierto() ? 'Cerrar' : 'Menú' }}
        </button>

        <nav [class.abierto]="navAbierto()">
          <a routerLink="/articulos" routerLinkActive="active" (click)="navAbierto.set(false)">Artículos</a>
          <a routerLink="/revistas" routerLinkActive="active" (click)="navAbierto.set(false)">Revistas</a>
          <a routerLink="/marcas" routerLinkActive="active" (click)="navAbierto.set(false)">Nuestras Marcas</a>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <router-outlet />
    </main>

    <footer class="site-footer">
      <span>© {{ anio }} PRIVAS Magazine</span>
      <a routerLink="/aviso-de-privacidad">Aviso de Privacidad</a>
    </footer>
  `,
})
export class PublicLayout implements OnInit {
  private readonly catSrv = inject(CategoriasService);
  readonly anio = new Date().getFullYear();
  readonly navAbierto = signal(false);
  readonly categorias = signal<Categoria[]>([]);

  async ngOnInit() {
    this.categorias.set(await this.catSrv.listar().catch(() => []));
  }
}
