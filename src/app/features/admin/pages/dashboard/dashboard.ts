import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import type { Articulo } from '../../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="admin-page">
      <div class="admin-page-head">
        <h1>Panel</h1>
      </div>

      <div class="admin-page__scroll">
    <div class="dash-tiles">
      <a routerLink="../articulos" class="dash-tile">
        <span class="dash-tile__n">{{ publicados() }}</span>
        <span class="dash-tile__k">artículos publicados</span>
      </a>
      <a routerLink="../articulos" [queryParams]="{ estado: 'borrador' }" class="dash-tile">
        <span class="dash-tile__n">{{ borradores() }}</span>
        <span class="dash-tile__k">en borrador</span>
      </a>
      <a routerLink="../articulos" [queryParams]="{ estado: 'programado' }" class="dash-tile">
        <span class="dash-tile__n">{{ programados() }}</span>
        <span class="dash-tile__k">programados</span>
      </a>
      <a routerLink="../ediciones" class="dash-tile">
        <span class="dash-tile__n">{{ ediciones() }}</span>
        <span class="dash-tile__k">ediciones de revista</span>
      </a>
      <a routerLink="../categorias" class="dash-tile">
        <span class="dash-tile__n">{{ categorias() }}</span>
        <span class="dash-tile__k">categorías</span>
      </a>
    </div>

        <div class="panel">
          <h2>Accesos rápidos</h2>
          <div class="dash-links">
            <a routerLink="../articulos/nuevo">Nuevo artículo →</a>
            <a routerLink="../ediciones">Subir una edición →</a>
            <a routerLink="../categorias">Gestionar categorías →</a>
            <a routerLink="../administradores">Invitar administrador →</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dash-tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1px;
      background: var(--line);
      border: 1px solid var(--line);
      margin-bottom: var(--space-lg);
    }
    .dash-tile {
      background: var(--white);
      padding: var(--space-lg) var(--space-md);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      transition: background var(--t);
    }
    .dash-tile:hover {
      background: var(--teal-wash);
    }
    .dash-tile__n {
      font-family: var(--serif);
      font-size: 2rem;
      line-height: 1;
    }
    .dash-tile__k {
      font-size: var(--fs-sm);
      color: var(--ink-55);
    }
    .dash-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-md) var(--space-xl);
    }
    .dash-links a {
      font-size: 0.9rem;
      font-weight: 600;
      border-bottom: 1px solid var(--teal);
      padding-bottom: 2px;
    }
    .dash-links a:hover {
      color: var(--teal);
    }
  `,
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly artSrv = inject(ArticulosService);
  private readonly edSrv = inject(EdicionesService);
  private readonly catSrv = inject(CategoriasService);

  private readonly articulos = signal<Articulo[]>([]);
  readonly ediciones = signal(0);
  readonly categorias = signal(0);

  readonly publicados = computed(
    () => this.articulos().filter((a) => a.estado === 'publicado').length,
  );
  readonly borradores = computed(
    () => this.articulos().filter((a) => a.estado === 'borrador').length,
  );
  readonly programados = computed(
    () => this.articulos().filter((a) => a.estado === 'programado').length,
  );

  async ngOnInit() {
    this.articulos.set(await this.artSrv.listarAdmin().catch(() => []));
    this.ediciones.set((await this.edSrv.listarAdmin().catch(() => [])).length);
    this.categorias.set((await this.catSrv.listar().catch(() => [])).length);
  }
}
