import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Meta tags dinámicos por página (issue #7): título, descripción, Open
 * Graph y Twitter Card. Se actualizan del lado del cliente con el Meta
 * service de Angular — funciona para el título de pestaña, PWA y
 * crawlers que sí ejecutan JS, pero NO para scrapers que leen el HTML
 * crudo sin JS (ej. Facebook) — eso necesitaría prerender/SSR por ruta,
 * fuera de alcance aquí (el sitio es una SPA 100% cliente, sin servidor
 * Node en producción). index.html trae un set default como fallback.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  actualizar(opts: {
    titulo: string;
    descripcion: string;
    imagenUrl?: string | null;
    tipo?: 'website' | 'article';
  }): void {
    const tituloCompleto = `${opts.titulo} · PRIVAS Magazine`;
    this.title.setTitle(tituloCompleto);

    const url = typeof location !== 'undefined' ? location.href : '';
    const tags: Record<string, string> = {
      description: opts.descripcion,
      'og:title': tituloCompleto,
      'og:description': opts.descripcion,
      'og:type': opts.tipo ?? 'website',
      'og:url': url,
      'twitter:card': 'summary_large_image',
      'twitter:title': tituloCompleto,
      'twitter:description': opts.descripcion,
    };
    if (opts.imagenUrl) {
      tags['og:image'] = opts.imagenUrl;
      tags['twitter:image'] = opts.imagenUrl;
    }

    for (const [name, content] of Object.entries(tags)) {
      const selector = name.startsWith('og:') ? `property="${name}"` : `name="${name}"`;
      this.meta.updateTag({ content }, selector);
    }
  }

  /** Links de vista previa (issue #75) — nunca deben indexarse ni compartirse como si fueran el artículo real. */
  noIndexar(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }
}
