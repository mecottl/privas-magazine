import { Component, OnInit, inject, signal } from '@angular/core';
import { MarcasService } from '../../../../core/services/marcas.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { mensajeError } from '../../../../core/services/errores';
import type { Marca } from '../../../../core/models';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [RevealDirective],
  template: `
    <section class="page">
      <div class="inicio-encabezado" reveal>
        <p class="eyebrow">El grupo</p>
        <h1>Nuestras Marcas</h1>
        <p>Las marcas del grupo PRIVAS y dónde seguirlas.</p>
      </div>
      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (cargando()) {
        <ul class="marcas" aria-hidden="true">
          @for (n of [1, 2, 3, 4, 5]; track n) {
            <li>
              <div class="sk" style="width:92px;height:92px;border-radius:999px"></div>
              <div class="sk sk--line" style="width:70px;margin-top:.6rem"></div>
            </li>
          }
        </ul>
      } @else {
      <ul class="marcas" data-reveal-stagger>
        @for (m of marcas(); track m.id) {
          <li reveal>
            <a [href]="m.red_social_url" target="_blank" rel="noopener">
              @if (m.logo_url) { <img [src]="m.logo_url" [alt]="m.nombre" loading="lazy" /> }
              <span>{{ m.nombre }}</span>
            </a>
          </li>
        } @empty {
          <li class="indice-vacio">Aún no hay marcas para mostrar.</li>
        }
      </ul>
      }
    </section>
  `,
})
export class Marcas implements OnInit {
  private readonly srv = inject(MarcasService);
  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  async ngOnInit() {
    try {
      this.marcas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
