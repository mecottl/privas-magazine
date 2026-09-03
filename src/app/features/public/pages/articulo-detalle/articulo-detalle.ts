import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import type { Articulo } from '../../../../core/models';

@Component({
  selector: 'app-articulo-detalle',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/articulos" class="articulo-volver">← Volver a artículos</a>
    </div>

    @if (cargando()) {
      <article class="articulo" aria-hidden="true">
        <div class="sk sk--line" style="width:40%"></div>
        <div class="sk" style="height:2.4rem;width:85%;margin:.6rem 0 1.4rem"></div>
        <div class="sk sk--img" style="aspect-ratio:16/9"></div>
        <div style="margin-top:1.6rem">
          <div class="sk sk--line"></div><div class="sk sk--line"></div>
          <div class="sk sk--line" style="width:92%"></div>
          <div class="sk sk--line" style="width:60%"></div>
        </div>
      </article>
    } @else if (error()) {
      <div class="page">
        <p class="error">{{ error() }}</p>
        <p><a routerLink="/articulos" class="leer">Ver todos los artículos →</a></p>
      </div>
    } @else if (articulo(); as a) {
      <article class="articulo">
        <header class="articulo-cabecera">
          <span class="meta">
            <span class="categoria-tag">{{ a.categorias?.nombre || 'Sin categoría' }}</span>
          </span>
          <h1>{{ a.titulo }}</h1>
          <p class="articulo-firma">
            <span>{{ a.autor_tipo === 'libre' ? (a.autor_texto || 'Redacción') : 'Redacción' }}</span>
            <span aria-hidden="true">·</span>
            <time [attr.datetime]="a.fecha_publicacion">{{ a.fecha_publicacion | date: 'longDate' }}</time>
          </p>
        </header>

        @if (a.imagen_portada_url) {
          <img [src]="a.imagen_portada_url" [alt]="a.titulo" decoding="async" />
        }

        <!-- MVP: cada bloque como texto plano, sin formato final -->
        <div class="articulo-cuerpo">
          @for (bloque of a.contenido_json; track $index) {
            <p>{{ bloque.contenido }}</p>
          }
        </div>

        <footer class="articulo-pie">
          <a routerLink="/articulos" class="leer">← Más artículos</a>
        </footer>
      </article>
    }
  `,
  styles: `
    .articulo-cabecera {
      margin-bottom: 1.4rem;
    }
    .articulo-firma {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--color-texto-suave);
      margin: 0.6rem 0 0;
    }
    .articulo-pie {
      margin-top: 2.5rem;
      padding-top: 1.2rem;
      border-top: 1px solid var(--color-linea);
    }
    .articulo-pie .leer {
      font-weight: 600;
      color: var(--color-acento);
    }
  `,
})
export class ArticuloDetalle implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly srv = inject(ArticulosService);
  private readonly title = inject(Title);
  readonly articulo = signal<Articulo | null>(null);
  readonly error = signal('');
  readonly cargando = signal(true);

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    try {
      const a = await this.srv.obtenerPublicoPorSlug(slug);
      if (!a) {
        this.error.set('No encontramos este artículo. Puede que se haya despublicado.');
        this.title.setTitle('Artículo no encontrado · PRIVAS Magazine');
      } else {
        this.articulo.set(a);
        this.title.setTitle(`${a.titulo} · PRIVAS Magazine`);
      }
    } catch (e) {
      this.error.set(String(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
