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
    <div class="page">
      <a routerLink="/articulos" class="articulo-volver">← Artículos</a>
    </div>
    @if (error()) { <p class="page error">{{ error() }}</p> }
    @if (articulo(); as a) {
      <article class="articulo">
        <span class="meta">
          <span class="categoria-tag">
            {{ a.categorias?.nombre || 'Sin categoría' }}
          </span>
          · {{ a.fecha_publicacion | date: 'longDate' }}
          · {{ a.autor_tipo === 'libre' ? a.autor_texto : 'Redacción' }}
        </span>
        <h1>{{ a.titulo }}</h1>
        @if (a.imagen_portada_url) { <img [src]="a.imagen_portada_url" [alt]="a.titulo" /> }
        <!-- MVP: cada bloque como texto plano, sin formato final -->
        <div class="articulo-cuerpo">
          @for (bloque of a.contenido_json; track $index) {
            <p>{{ bloque.contenido }}</p>
          }
        </div>
      </article>
    } @else if (!error()) {
      <p class="page">Cargando…</p>
    }
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
