import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { NewsletterForm } from '../newsletter/newsletter-form';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import type { Articulo, EdicionRevista } from '../../../../core/models';

interface Tema {
  nombre: string;
  descripcion: string;
  /** path de un icono de línea 24x24 (stroke). */
  icono: string;
}

const NOMBRE_TEMPORADA: Record<string, string> = {
  'primavera-verano': 'Primavera-Verano',
  'otono-invierno': 'Otoño-Invierno',
};

/**
 * Portada editorial de PRIVAS Magazine (ruta `/`).
 * Patrón: Newsletter / Content First + Editorial Grid.
 * El listado completo de artículos con filtros vive en `/articulos`.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DatePipe, NewsletterForm, RevealDirective],
  template: `
    <div class="landing">
      <!-- HERO -->
      <section class="landing-hero">
        <div class="landing-hero__inner">
          <div reveal>
            <p class="eyebrow">Revista digital · Yucatán</p>
            <h1>Historias que <em>merecen</em> contarse bien.</h1>
            <p>
              Turismo, gastronomía, arte, cultura y entretenimiento de la península,
              con la mirada pausada y el cuidado de una publicación impresa.
            </p>
            <div class="landing-hero__acciones">
              <a routerLink="/articulos" class="btn btn--primario">
                Leer los artículos
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
              <a routerLink="/revistas" class="btn btn--fantasma">Ver la revista</a>
            </div>
          </div>

          <figure
            class="landing-hero__media"
            [class.landing-hero__media--vacio]="!portadaHero()"
            reveal
          >
            @if (portadaHero(); as src) {
              <img [src]="src" alt="Portada de la edición más reciente" />
              <figcaption>Última edición</figcaption>
            } @else {
              <span>PRIVAS</span>
            }
          </figure>
        </div>
      </section>

      <!-- TEMAS -->
      <section reveal>
        <div class="seccion-head">
          <h2>Lo que cubrimos</h2>
        </div>
        <ul class="temas" data-reveal-stagger>
          @for (t of temas; track t.nombre) {
            <li reveal>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path [attr.d]="t.icono" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>{{ t.nombre }}</span>
              <small>{{ t.descripcion }}</small>
            </li>
          }
        </ul>
      </section>

      <!-- LO MÁS RECIENTE -->
      <section reveal>
        <div class="seccion-head">
          <h2>Lo más reciente</h2>
          <a routerLink="/articulos" class="ver-todo">Todos los artículos →</a>
        </div>

        @if (error()) { <p class="error">{{ error() }}</p> }

        @if (principal(); as p) {
          <a [routerLink]="['/articulos', p.slug]" class="nota-principal" reveal>
            @if (p.imagen_portada_url) {
              <img [src]="p.imagen_portada_url" [alt]="p.titulo" />
            }
            <div>
              <span class="meta">
                <span class="categoria-tag">{{ p.categorias?.nombre || 'Sin categoría' }}</span>
                · {{ p.fecha_publicacion | date: 'longDate' }}
              </span>
              <h3 class="titulo">{{ p.titulo }}</h3>
              <p class="extracto">{{ p.extracto }}</p>
              <span class="leer">Leer la nota</span>
            </div>
          </a>
        }

        <ul class="indice" data-reveal-stagger>
          @for (a of resto(); track a.id) {
            <li reveal>
              <a [routerLink]="['/articulos', a.slug]">
                <span class="meta">
                  <span class="categoria-tag">{{ a.categorias?.nombre || 'Sin categoría' }}</span>
                  · {{ a.fecha_publicacion | date: 'longDate' }}
                </span>
                <h3>{{ a.titulo }}</h3>
                <p class="extracto">{{ a.extracto }}</p>
              </a>
            </li>
          }
        </ul>

        @if (!principal() && resto().length === 0 && !error()) {
          <p class="indice-vacio">Todavía no hay artículos publicados.</p>
        }
      </section>

      <!-- REVISTA DESTACADA -->
      @if (edicion(); as e) {
        <section reveal>
          <div class="revista-destacada">
            <img
              class="revista-destacada__portada"
              [src]="e.portada_url"
              [alt]="'Portada de ' + e.titulo"
            />
            <div>
              <p class="eyebrow">La revista</p>
              <h2>{{ e.titulo }}</h2>
              <p>
                {{ nombreTemporada(e.temporada) }} {{ e.anio }} · edición completa en PDF,
                lista para leer o descargar.
              </p>
              <a [href]="e.pdf_url" target="_blank" rel="noopener" class="btn btn--primario">
                Abrir el PDF
              </a>
            </div>
          </div>
        </section>
      }

      <!-- CTA / NEWSLETTER -->
      <section class="landing-cta" reveal>
        <h2>No te pierdas la próxima historia</h2>
        <p>Un correo cuando publicamos algo nuevo o sale una edición. Sin ruido.</p>
        <app-newsletter-form />
      </section>
    </div>
  `,
})
export class Landing implements OnInit {
  private readonly artSrv = inject(ArticulosService);
  private readonly edSrv = inject(EdicionesService);

  readonly articulos = signal<Articulo[]>([]);
  readonly edicion = signal<EdicionRevista | null>(null);
  readonly error = signal('');

  readonly principal = computed(() => this.articulos()[0]);
  readonly resto = computed(() => this.articulos().slice(1, 5));
  readonly portadaHero = computed(
    () => this.edicion()?.portada_url ?? this.principal()?.imagen_portada_url ?? null,
  );

  readonly temas: Tema[] = [
    {
      nombre: 'Turismo',
      descripcion: 'Rutas, pueblos y rincones de la península.',
      icono: 'M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    },
    {
      nombre: 'Gastronomía',
      descripcion: 'Cocina yucateca, mercados y sobremesa.',
      icono: 'M5 3v8a3 3 0 0 0 6 0V3 M8 3v18 M17 3c-1.5 1-2 3-2 6s.5 4 2 5v7',
    },
    {
      nombre: 'Arte',
      descripcion: 'Artistas, talleres y espacios de la región.',
      icono: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4-.3-.4-.4-.9-.4-1.3 0-1.1.9-2 2-2h1.5A3.5 3.5 0 0 0 21 8.5C21 5.5 16.9 3 12 3Z M7.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z M12 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    },
    {
      nombre: 'Cultura',
      descripcion: 'Tradición viva, lengua e historia.',
      icono: 'M3 21h18 M5 21V10l7-5 7 5v11 M9 21v-6h6v6',
    },
    {
      nombre: 'Entretenimiento',
      descripcion: 'Agenda, escena y lo que vale la pena ver.',
      icono: 'M4 4h16v16H4z M4 9h16 M9 4v5 M15 4v5 M4 15h16',
    },
  ];

  nombreTemporada(t: string): string {
    return NOMBRE_TEMPORADA[t] ?? t;
  }

  async ngOnInit() {
    try {
      this.articulos.set(await this.artSrv.listarPublicos());
    } catch (e) {
      this.error.set(String(e));
    }
    try {
      const eds = await this.edSrv.listarPublicas();
      this.edicion.set(eds[0] ?? null);
    } catch {
      /* la revista es opcional en la portada */
    }
  }
}
