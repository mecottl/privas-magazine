import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { mensajeError } from '../../../../core/services/errores';
import type { Articulo, BloqueContenido } from '../../../../core/models';

@Component({
  selector: 'app-articulo-detalle',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './articulo-detalle.html',
  styleUrl: './articulo-detalle.scss',
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
    if (!Array.isArray(it)) return [];
    // list v1 → string[]; list v2 → [{ content, items }]
    return it.map((x) =>
      x && typeof x === 'object'
        ? String((x as { content?: string }).content ?? '')
        : String(x),
    );
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
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
