import { Component, OnInit, inject, signal } from '@angular/core';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import type { EdicionRevista } from '../../../../core/models';

@Component({
  selector: 'app-revistas',
  standalone: true,
  template: `
    <section class="page">
      <h1>Ediciones de la revista</h1>
      @if (error()) { <p class="error">{{ error() }}</p> }
      <ul class="revistas">
        @for (ed of ediciones(); track ed.id) {
          <li>
            <a [href]="ed.pdf_url" target="_blank" rel="noopener">
              <img [src]="ed.portada_url" [alt]="ed.titulo" />
              <span>{{ ed.titulo }} — {{ ed.temporada }} {{ ed.anio }}</span>
            </a>
          </li>
        } @empty {
          <li>Todavía no hay ediciones publicadas.</li>
        }
      </ul>
    </section>
  `,
})
export class Revistas implements OnInit {
  private readonly srv = inject(EdicionesService);
  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');

  async ngOnInit() {
    try {
      this.ediciones.set(await this.srv.listarPublicas());
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
