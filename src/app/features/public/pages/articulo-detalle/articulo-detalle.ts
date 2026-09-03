import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import type { Articulo, BloqueContenido } from '../../../../core/models';

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

        <div class="articulo-cuerpo">
          @for (b of bloques(a); track $index) {
            @switch (b.type) {
              @case ('header') {
                @switch (nivel(b)) {
                  @case (2) { <h2 [innerHTML]="html(b, 'text')"></h2> }
                  @case (3) { <h3 [innerHTML]="html(b, 'text')"></h3> }
                  @default { <h4 [innerHTML]="html(b, 'text')"></h4> }
                }
              }
              @case ('quote') {
                <blockquote>
                  <p [innerHTML]="html(b, 'text')"></p>
                  @if (dato(b, 'caption')) {
                    <cite [innerHTML]="html(b, 'caption')"></cite>
                  }
                </blockquote>
              }
              @case ('list') {
                @if (esOrdenada(b)) {
                  <ol>
                    @for (item of items(b); track $index) { <li [innerHTML]="item"></li> }
                  </ol>
                } @else {
                  <ul>
                    @for (item of items(b); track $index) { <li [innerHTML]="item"></li> }
                  </ul>
                }
              }
              @case ('image') {
                @if (imagenUrl(b)) {
                  <figure>
                    <img [src]="imagenUrl(b)" [alt]="textoPlano(b, 'caption') || a.titulo" loading="lazy" decoding="async" />
                    @if (dato(b, 'caption')) {
                      <figcaption [innerHTML]="html(b, 'caption')"></figcaption>
                    }
                  </figure>
                }
              }
              @default {
                <p [innerHTML]="html(b, 'text')"></p>
              }
            }
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
    /* Bloques del cuerpo — heredan la tipografía de src/styles.scss */
    .articulo-cuerpo h2 {
      font-size: clamp(1.35rem, 1.1rem + 1vw, 1.7rem);
      margin: 2rem 0 0.6rem;
    }
    .articulo-cuerpo h3 {
      font-size: 1.25rem;
      margin: 1.7rem 0 0.5rem;
    }
    .articulo-cuerpo h4 {
      font-size: 1.08rem;
      margin: 1.5rem 0 0.4rem;
    }
    .articulo-cuerpo ul,
    .articulo-cuerpo ol {
      margin: 0 0 1.3em;
      padding-left: 1.4em;
    }
    .articulo-cuerpo li {
      margin-bottom: 0.4em;
    }
    .articulo-cuerpo figure {
      margin: 1.8em 0;
    }
    .articulo-cuerpo figure img {
      width: 100%;
      border-radius: var(--radius);
    }
    .articulo-cuerpo figcaption {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: var(--color-texto-suave);
      text-align: center;
    }
    .articulo-cuerpo blockquote cite {
      display: block;
      margin-top: 0.5rem;
      font-family: var(--fuente-texto);
      font-size: 0.85rem;
      font-style: normal;
      color: var(--color-texto-suave);
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

  // --- helpers de render de bloques Editor.js ---

  /**
   * Normaliza el contenido: acepta el formato viejo `{ tipo, contenido }`
   * (artículos anteriores al editor de bloques) y lo trata como párrafo.
   */
  bloques(a: Articulo): BloqueContenido[] {
    const raw = Array.isArray(a?.contenido_json) ? a.contenido_json : [];
    return (raw as (BloqueContenido & { tipo?: string; contenido?: string })[])
      .map((b) =>
        b?.type
          ? b
          : ({ type: 'paragraph', data: { text: b?.contenido ?? '' } } as BloqueContenido),
      )
      .filter((b) => b.type);
  }

  private data(b: BloqueContenido): Record<string, unknown> {
    return (b?.data ?? {}) as Record<string, unknown>;
  }
  dato(b: BloqueContenido, k: string): unknown {
    return this.data(b)[k];
  }
  html(b: BloqueContenido, k: string): string {
    return String(this.data(b)[k] ?? '');
  }
  textoPlano(b: BloqueContenido, k: string): string {
    return this.html(b, k).replace(/<[^>]+>/g, '').trim();
  }
  nivel(b: BloqueContenido): number {
    const n = Number(this.data(b)['level'] ?? 2);
    return Math.min(Math.max(Number.isFinite(n) ? n : 2, 2), 4);
  }
  items(b: BloqueContenido): string[] {
    const it = this.data(b)['items'];
    return Array.isArray(it) ? it.map((x) => String(x)) : [];
  }
  esOrdenada(b: BloqueContenido): boolean {
    return this.data(b)['style'] === 'ordered';
  }
  imagenUrl(b: BloqueContenido): string {
    const d = this.data(b);
    const file = d['file'] as { url?: string } | undefined;
    return file?.url ?? String(d['url'] ?? '');
  }

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
