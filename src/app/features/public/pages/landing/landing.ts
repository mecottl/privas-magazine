import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { mensajeError } from '../../../../core/services/errores';
import type { Articulo, EdicionRevista } from '../../../../core/models';

const NOMBRE_TEMPORADA: Record<string, string> = {
  'primavera-verano': 'Primavera · Verano',
  'otono-invierno': 'Otoño · Invierno',
};

/**
 * Portada de PRIVAS Magazine (ruta `/`).
 * Hero a sangre → "Artículos del mes" (carrusel) → "Ediciones".
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DatePipe, RevealDirective],
  template: `
    <!-- ===================== HERO ===================== -->
    <section class="hero">
      <div class="hero__media hero__media--vacio">
        <img [src]="heroImg" alt="" fetchpriority="high" />
      </div>

      <div class="hero__inner">
        <span class="hero__eyebrow">Grupo Privas · Península de Yucatán</span>
        <h1 class="hero__title">
          Una revista para los <em>amantes</em> a los viajes
        </h1>
      </div>

      <a href="#articulos" class="hero__cue" aria-label="Ver más">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </a>
    </section>

    <!-- ================ ARTÍCULOS DEL MES ================ -->
    <section class="franja" id="articulos">
      <div class="franja__wrap">
        <div class="seccion-head" reveal>
          <h2>Artículos Del Mes</h2>
          <a routerLink="/articulos" class="ver-todo">Ver todos los artículos</a>
        </div>

        @if (error()) { <p class="error" style="color:var(--on-brand)">{{ error() }}</p> }

        <div class="carrusel" reveal>
          <button
            type="button"
            class="carrusel__flecha carrusel__flecha--prev"
            (click)="mover(-1)"
            [disabled]="!puedePrev()"
            aria-label="Anterior"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <div class="carrusel__pista" #pista (scroll)="alScroll()">
            @if (cargando()) {
              @for (n of [1, 2, 3]; track n) {
                <article class="art-card">
                  <div class="sk sk--img" style="aspect-ratio:16/10"></div>
                  <div class="art-card__body">
                    <div class="sk sk--line" style="width:45%"></div>
                    <div class="sk sk--title"></div>
                    <div class="sk sk--line" style="width:80%"></div>
                  </div>
                </article>
              }
            } @else {
              @for (a of carrusel(); track a.id; let i = $index) {
                <a class="art-card" [style.--i]="i" [routerLink]="['/articulos', a.slug]">
                  @if (a.imagen_portada_url) {
                    <img class="art-card__img" [src]="a.imagen_portada_url" [alt]="a.titulo" loading="lazy" decoding="async" />
                  } @else {
                    <div class="art-card__img" aria-hidden="true"></div>
                  }
                  <div class="art-card__body">
                    <div class="art-card__top">
                      <time [attr.datetime]="a.fecha_publicacion">
                        {{ a.fecha_publicacion | date: 'dd MMM. y' }}
                      </time>
                      <span>{{ a.categorias?.[0]?.nombre ?? '' }}</span>
                    </div>
                    <h3 class="art-card__titulo">{{ a.titulo }}</h3>
                    <p class="art-card__extracto">{{ a.extracto }}</p>
                    <span class="art-card__mas">Leer más
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </span>
                  </div>
                </a>
              } @empty {
                <article class="art-card art-card--vacio">
                  Aún no hay artículos publicados. Vuelve pronto.
                </article>
              }
            }
          </div>

          <button
            type="button"
            class="carrusel__flecha carrusel__flecha--next"
            (click)="mover(1)"
            [disabled]="!puedeNext()"
            aria-label="Siguiente"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ==================== EDICIONES ==================== -->
    <section
      class="franja franja--foto franja--fin"
      [style.--franja-bg]="fondoEdiciones"
    >
      <div class="franja__wrap">
        <div class="ediciones-head" reveal>
          <h2>Ediciones</h2>
          <a routerLink="/revistas" class="ediciones-buscar">
            Buscar por ediciones
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>

        <div class="ediciones-grid" reveal>
          @for (slot of slotsEdiciones(); track $index; let i = $index) {
            @if (slot; as e) {
              <article class="edicion-card" [style.--i]="i">
                <span class="edicion-card__temporada">{{ nombreTemporada(e.temporada) }}</span>
                <img class="edicion-card__portada" [src]="e.portada_url" [alt]="'Portada — ' + e.titulo" loading="lazy" />
                <span class="edicion-card__num">Edición 0{{ i + 1 }}</span>
                <a class="btn btn--primario btn--sm" [href]="e.pdf_url" target="_blank" rel="noopener">
                  Ver
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </a>
              </article>
            } @else {
              <article class="edicion-card edicion-card--proxima" [style.--i]="i">
                <span class="edicion-card__temporada">{{ temporadaSlot(i) }}</span>
                <p class="edicion-card__proximamente">
                  <span>Próximamente</span>
                  <span>Próximamente</span>
                </p>
                <span class="edicion-card__num">Edición 0{{ i + 1 }}</span>
              </article>
            }
          }
        </div>
      </div>
    </section>
  `,
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
    const card = el.querySelector<HTMLElement>('.art-card');
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
