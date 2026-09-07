import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { ArticuloCard } from '../../components/articulo-card/articulo-card';
import { mensajeError } from '../../../../core/services/errores';
import type { Articulo, EdicionRevista } from '../../../../core/models';

const NOMBRE_TEMPORADA: Record<string, string> = {
  'primavera-verano': 'Primavera · Verano',
  'otono-invierno': 'Otoño · Invierno',
};

/**
 * Portada de PRIVAS Magazine (ruta `/`).
 * Hero a sangre → "Últimos artículos" (carrusel) → "Ediciones".
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, RevealDirective, ArticuloCard],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  private readonly artSrv = inject(ArticulosService);
  private readonly edSrv = inject(EdicionesService);
  private readonly pista = viewChild<ElementRef<HTMLElement>>('pista');

  readonly articulos = signal<Articulo[]>([]);
  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  readonly puedePrev = signal(false);
  readonly puedeNext = signal(true);

  readonly carrusel = computed(() => this.articulos().slice(0, 9));
  /** Fotos fijas en `public/`. Si fallan, quedan los degradados de marca. */
  readonly heroImg = '/hero.jpg';
  readonly fondoEdiciones = 'url("/ediciones-bg.jpg")';
  /** Dos huecos: edición existente o `null` para "Próximamente". */
  readonly slotsEdiciones = computed<(EdicionRevista | null)[]>(() => {
    const eds = this.ediciones();
    return [eds[0] ?? null, eds[1] ?? null];
  });

  nombreTemporada(t: string): string {
    return NOMBRE_TEMPORADA[t] ?? t;
  }

  /** Etiqueta de temporada esperada para un hueco vacío (alterna las dos). */
  temporadaSlot(i: number): string {
    const usada = this.ediciones()[0]?.temporada;
    if (i === 1 && usada) {
      return usada === 'primavera-verano'
        ? NOMBRE_TEMPORADA['otono-invierno']
        : NOMBRE_TEMPORADA['primavera-verano'];
    }
    return i === 0
      ? NOMBRE_TEMPORADA['primavera-verano']
      : NOMBRE_TEMPORADA['otono-invierno'];
  }

  mover(dir: -1 | 1) {
    const el = this.pista()?.nativeElement;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('app-articulo-card, .art-card');
    const paso = card ? card.offsetWidth + 24 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * paso, behavior: 'smooth' });
  }

  alScroll() {
    const el = this.pista()?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    this.puedePrev.set(el.scrollLeft > 8);
    this.puedeNext.set(el.scrollLeft < max - 8);
  }

  async ngOnInit() {
    try {
      this.articulos.set(await this.artSrv.listarPublicos());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
    try {
      this.ediciones.set(await this.edSrv.listarPublicas());
    } catch {
      /* la sección de ediciones tolera no tener datos */
    }
    queueMicrotask(() => this.alScroll());
  }
}
