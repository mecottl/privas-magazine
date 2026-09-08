import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
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
import { EdicionCard } from '../../components/edicion-card/edicion-card';
import { HeroMedia } from '../../components/hero-media/hero-media';
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
  imports: [RouterLink, RevealDirective, ArticuloCard, EdicionCard, HeroMedia],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  private readonly artSrv = inject(ArticulosService);
  private readonly edSrv = inject(EdicionesService);
  private readonly zone = inject(NgZone);
  private readonly pista = viewChild<ElementRef<HTMLElement>>('pista');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.onArrastreSoltar());
  }

  readonly articulos = signal<Articulo[]>([]);
  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  /** Estado del carrusel: en qué extremo está, cuánto se ha recorrido y el
   *  tamaño relativo del "pulgar" de la barra de progreso (visible / total). */
  readonly enInicio = signal(true);
  readonly enFin = signal(false);
  /** Barra de progreso: ancho del pulgar (0.16–1) y su posición (0–1). */
  readonly pulgarAncho = signal(1);
  readonly pulgarPos = signal(0);
  /** Mientras se arrastra la pista, las tarjetas no reciben clicks. */
  readonly arrastrando = signal(false);
  private arrastre = { activo: false, movio: false, x0: 0, scroll0: 0 };

  readonly carrusel = computed(() => this.articulos().slice(0, 9));
  /** Fondo de la franja "Ediciones": AVIF/WebP con JPG de reserva. */
  readonly fondoEdiciones =
    'image-set(' +
    'url("/img/ediciones-bg-1400.avif") type("image/avif"),' +
    'url("/img/ediciones-bg-1400.webp") type("image/webp"),' +
    'url("/ediciones-bg.jpg") type("image/jpeg"))';
  /** Dos huecos: edición existente o `null` para "Próximamente". */
  readonly slotsEdiciones = computed<(EdicionRevista | null)[]>(() => {
    const eds = this.ediciones();
    return [eds[0] ?? null, eds[1] ?? null];
  });

  readonly anioActual = new Date().getFullYear();

  /** Año esperado para un hueco vacío: el de la edición vigente o el actual. */
  anioSlot(): number {
    return this.ediciones()[0]?.anio ?? this.anioActual;
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

  /** Avance por "página": tantas tarjetas enteras como quepan a la vista. */
  private paso(el: HTMLElement): number {
    const card = el.querySelector<HTMLElement>('app-articulo-card, .art-card');
    const gap = parseFloat(getComputedStyle(el).columnGap) || 16;
    const anchoTarjeta = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    const porPagina = Math.max(1, Math.floor(el.clientWidth / anchoTarjeta));
    return anchoTarjeta * porPagina;
  }

  mover(dir: -1 | 1) {
    const el = this.pista()?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: dir * this.paso(el), behavior: 'smooth' });
  }

  alScroll() {
    const el = this.pista()?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    this.enInicio.set(el.scrollLeft <= 12);
    this.enFin.set(el.scrollLeft >= max - 12);
    this.pulgarPos.set(max > 0 ? el.scrollLeft / max : 0);
    this.pulgarAncho.set(
      el.scrollWidth > 0
        ? Math.min(1, Math.max(0.16, el.clientWidth / el.scrollWidth))
        : 1,
    );
  }

  // --- Arrastrar para desplazar (pointer). Los listeners de move/up se
  //     enganchan solo durante el gesto para no disparar CD en cada mousemove.
  alBajar(ev: PointerEvent) {
    if (ev.button !== 0) return;
    const el = this.pista()?.nativeElement;
    if (!el) return;
    this.arrastre = { activo: true, movio: false, x0: ev.clientX, scroll0: el.scrollLeft };
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', this.onArrastreMover, { passive: true });
      window.addEventListener('pointerup', this.onArrastreSoltar, { once: true });
      window.addEventListener('pointercancel', this.onArrastreSoltar, { once: true });
    });
  }

  private readonly onArrastreMover = (ev: PointerEvent) => {
    const el = this.pista()?.nativeElement;
    if (!el || !this.arrastre.activo) return;
    const dx = ev.clientX - this.arrastre.x0;
    if (!this.arrastre.movio && Math.abs(dx) < 6) return;
    if (!this.arrastre.movio) {
      this.arrastre.movio = true;
      this.zone.run(() => this.arrastrando.set(true));
    }
    el.scrollLeft = this.arrastre.scroll0 - dx;
  };

  private readonly onArrastreSoltar = () => {
    this.arrastre.activo = false;
    window.removeEventListener('pointermove', this.onArrastreMover);
    if (this.arrastrando()) {
      // mantener el bloqueo hasta pasado el click que sigue al pointerup
      setTimeout(() => this.zone.run(() => this.arrastrando.set(false)), 0);
    }
  };

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
    // Deja que el @for pinte las tarjetas antes de medir la pista.
    setTimeout(() => this.alScroll(), 60);
  }
}
