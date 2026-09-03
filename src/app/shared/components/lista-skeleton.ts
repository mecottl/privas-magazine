import { Component, input } from '@angular/core';

/**
 * Placeholder de carga para listas de artículos/ediciones.
 * Contenedor de altura estable → evita saltos de layout al llegar el contenido.
 */
@Component({
  selector: 'app-lista-skeleton',
  standalone: true,
  template: `
    <ul class="sk-lista" aria-hidden="true">
      @for (f of filasArray(); track $index) {
        <li>
          @if (conImagen()) { <div class="sk sk--img"></div> }
          <div class="sk-lista__texto">
            <div class="sk sk--line" style="width:35%"></div>
            <div class="sk sk--title"></div>
            <div class="sk sk--line" style="width:90%"></div>
            <div class="sk sk--line" style="width:75%"></div>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .sk-lista {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .sk-lista li {
      display: grid;
      grid-template-columns: 148px 1fr;
      gap: 1.4rem;
      padding: 1.5rem 0;
      border-top: 1px solid var(--color-linea);
    }
    .sk-lista li:has(.sk-lista__texto:only-child) {
      grid-template-columns: 1fr;
    }
    .sk-lista .sk--img {
      width: 148px;
      height: 110px;
      aspect-ratio: auto;
    }
    @media (max-width: 560px) {
      .sk-lista li {
        grid-template-columns: 96px 1fr;
      }
      .sk-lista .sk--img {
        width: 96px;
        height: 96px;
      }
    }
  `,
})
export class ListaSkeleton {
  readonly filas = input(3);
  readonly conImagen = input(true);
  filasArray() {
    return Array.from({ length: this.filas() });
  }
}
