import { Component, OnInit, inject, signal } from '@angular/core';
import { MarcasService } from '../../../../core/services/marcas.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
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
      <ul class="marcas" data-reveal-stagger>
        @for (m of marcas(); track m.id) {
          <li reveal>
            <a [href]="m.red_social_url" target="_blank" rel="noopener">
              @if (m.logo_url) { <img [src]="m.logo_url" [alt]="m.nombre" /> }
              <span>{{ m.nombre }}</span>
            </a>
          </li>
        } @empty {
          <li class="indice-vacio">Próximamente.</li>
        }
      </ul>
    </section>
  `,
})
export class Marcas implements OnInit {
  private readonly srv = inject(MarcasService);
  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');

  async ngOnInit() {
    try {
      this.marcas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
