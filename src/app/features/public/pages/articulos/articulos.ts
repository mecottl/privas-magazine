import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import type { Articulo, Categoria } from '../../../../core/models';

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [RouterLink, DatePipe, RevealDirective],
  template: `
    <section class="page">
      <div class="inicio-encabezado" reveal>
        <p class="eyebrow">El archivo completo</p>
        <h1>Artículos</h1>
        <p>Todo lo que hemos publicado, filtrable por sección.</p>
      </div>

      <nav class="filtro-categorias" aria-label="Filtrar por categoría">
        <button type="button" [class.activa]="!categoria()" (click)="filtrar('')">Todas</button>
        @for (c of categorias(); track c.id) {
          <button
            type="button"
            [class.activa]="categoria() === c.slug"
            (click)="filtrar(c.slug)"
          >
            {{ c.nombre }}
          </button>
        }
      </nav>

      @if (error()) { <p class="error">{{ error() }}</p> }

      <ul class="articulos">
        @for (a of articulos(); track a.id) {
          <li>
            @if (a.imagen_portada_url) { <img [src]="a.imagen_portada_url" [alt]="a.titulo" /> }
            <div>
              <span class="meta">
                <span class="categoria-tag">
                  {{ a.categorias?.nombre || 'Sin categoría' }}
                </span>
                · {{ a.fecha_publicacion | date: 'longDate' }}
              </span>
              <a [routerLink]="['/articulos', a.slug]"><h2>{{ a.titulo }}</h2></a>
              <p>{{ a.extracto }}</p>
            </div>
          </li>
        } @empty {
          <li class="indice-vacio">No hay artículos publicados todavía.</li>
        }
      </ul>
    </section>
  `,
})
export class Articulos implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly catSrv = inject(CategoriasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly articulos = signal<Articulo[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly error = signal('');
  /** slug de categoría activo; '' = todas. Refleja el query param `categoria`. */
  readonly categoria = signal('');

  async ngOnInit() {
    this.categorias.set(await this.catSrv.listar().catch(() => []));

    // El filtro se toma de la URL (?categoria=slug) para que los enlaces del
    // kicker del masthead funcionen aunque ya estemos en /articulos.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        this.categoria.set(pm.get('categoria') ?? '');
        void this.cargar();
      });
  }

  /** Cambia el filtro escribiéndolo en la URL (una sola fuente de verdad). */
  filtrar(slug: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoria: slug || null },
      queryParamsHandling: 'merge',
    });
  }

  async cargar() {
    this.error.set('');
    try {
      this.articulos.set(
        await this.srv.listarPublicos(this.categoria() || undefined),
      );
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
