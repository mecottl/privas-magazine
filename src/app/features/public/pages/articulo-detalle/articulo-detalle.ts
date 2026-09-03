import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import type { Articulo } from '../../../../core/models';

@Component({
  selector: 'app-articulo-detalle',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="page">
      <p><a routerLink="/articulos">← Artículos</a></p>
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (articulo(); as a) {
        <article>
          <span class="meta">
            {{ a.categorias?.nombre || 'Sin categoría' }}
            · {{ a.fecha_publicacion | date: 'longDate' }}
            · {{ a.autor_tipo === 'libre' ? a.autor_texto : 'Redacción' }}
          </span>
          <h1>{{ a.titulo }}</h1>
          @if (a.imagen_portada_url) { <img [src]="a.imagen_portada_url" [alt]="a.titulo" /> }
          <!-- MVP: cada bloque como texto plano, sin formato final -->
          @for (bloque of a.contenido_json; track $index) {
            <p>{{ bloque.contenido }}</p>
          }
        </article>
      } @else if (!error()) {
        <p>Cargando…</p>
      }
    </section>
  `,
})
export class ArticuloDetalle implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly srv = inject(ArticulosService);
  readonly articulo = signal<Articulo | null>(null);
  readonly error = signal('');

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    try {
      const a = await this.srv.obtenerPublicoPorSlug(slug);
      if (!a) this.error.set('Artículo no encontrado.');
      this.articulo.set(a);
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
