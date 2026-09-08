import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { LQIP } from '../../../../shared/lqip.generated';

/**
 * Foto a sangre con `<picture>` responsive (AVIF/WebP + srcset) y un
 * placeholder borroso (LQIP) que se desvanece al cargar la imagen real.
 * Las variantes las genera `scripts/optimize-logos.mjs` en `public/img/`.
 *
 * `nombre` es la clave del asset:
 *   'hero' | 'ediciones-bg' | 'cat-turismo' | 'cat-archivo' | …
 */
@Component({
  selector: 'app-hero-media',
  standalone: true,
  templateUrl: './hero-media.html',
  styleUrl: './hero-media.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroMedia {
  readonly nombre = input.required<string>();
  readonly alt = input('');
  /** LCP (hero de la vista): carga con prioridad y sin lazy. */
  readonly prioridad = input(false);
  /** Anchos disponibles para el srcset (deben existir en public/img/). */
  readonly anchos = input<number[]>([800, 1400, 2000]);
  readonly sizes = input('100vw');

  readonly cargada = signal(false);

  /** JPG original — último recurso para navegadores sin AVIF/WebP. */
  readonly fallback = computed(() => {
    const n = this.nombre();
    return n.startsWith('cat-')
      ? `/categorias/${n.slice(4)}.jpg`
      : `/${n}.jpg`;
  });

  readonly lqip = computed(() => LQIP[this.nombre()] ?? '');

  srcset(fmt: 'avif' | 'webp'): string {
    const n = this.nombre();
    return this.anchos()
      .map((w) => `/img/${n}-${w}.${fmt} ${w}w`)
      .join(', ');
  }
}
