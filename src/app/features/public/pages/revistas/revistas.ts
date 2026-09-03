import { Component, OnInit, inject, signal } from '@angular/core';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import type { EdicionRevista } from '../../../../core/models';

const NOMBRE_TEMPORADA: Record<string, string> = {
  'primavera-verano': 'Primavera-Verano',
  'otono-invierno': 'Otoño-Invierno',
};

@Component({
  selector: 'app-revistas',
  standalone: true,
  imports: [RevealDirective],
  template: `
    <section class="page">
      <div class="inicio-encabezado" reveal>
        <p class="eyebrow">La biblioteca</p>
        <h1>Ediciones de la revista</h1>
        <p>El catálogo completo de PRIVAS Magazine, dos ediciones al año.</p>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (cargando()) {
        <ul class="revistas" aria-hidden="true">
          @for (n of [1, 2, 3, 4]; track n) {
            <li>
              <div class="sk sk--img" style="aspect-ratio:3/4"></div>
              <div class="sk sk--line" style="width:80%;margin-top:.6rem"></div>
              <div class="sk sk--line" style="width:50%"></div>
            </li>
          }
        </ul>
      } @else {
      <ul class="revistas" data-reveal-stagger>
        @for (ed of ediciones(); track ed.id) {
          <li reveal>
            <a [href]="ed.pdf_url" target="_blank" rel="noopener">
              <figure>
                <img [src]="ed.portada_url" [alt]="ed.titulo" />
                <figcaption>Abrir PDF</figcaption>
              </figure>
              <span class="titulo-edicion">{{ ed.titulo }}</span>
              <span class="temporada">{{ nombreTemporada(ed.temporada) }} {{ ed.anio }}</span>
            </a>
          </li>
        } @empty {
          <li class="indice-vacio">Todavía no hay ediciones publicadas.</li>
        }
      </ul>
      }
    </section>
  `,
})
export class Revistas implements OnInit {
  private readonly srv = inject(EdicionesService);
  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  nombreTemporada(t: string): string {
    return NOMBRE_TEMPORADA[t] ?? t;
  }

  async ngOnInit() {
    try {
      this.ediciones.set(await this.srv.listarPublicas());
    } catch (e) {
      this.error.set(String(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
