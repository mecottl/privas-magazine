import { Component, OnInit, inject, signal } from '@angular/core';
import { MarcasService } from '../../../../core/services/marcas.service';
import type { Marca } from '../../../../core/models';

@Component({
  selector: 'app-marcas',
  standalone: true,
  template: `
    <section class="page">
      <div class="inicio-encabezado">
        <h1>Nuestras Marcas</h1>
      </div>
      @if (error()) { <p class="error">{{ error() }}</p> }
      <ul class="marcas">
        @for (m of marcas(); track m.id) {
          <li>
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
