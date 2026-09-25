import { Component, HostListener, input, signal } from '@angular/core';

/**
 * Botón ⋮ con menú desplegable de opciones — solo se ve en móvil (≤760px);
 * en escritorio las tablas muestran sus botones normales (`.acciones`).
 * Las opciones se proyectan: <button>/<a> dentro de <app-menu-opciones>.
 */
@Component({
  selector: 'app-menu-opciones',
  standalone: true,
  template: `
    <button
      type="button"
      class="mo__btn"
      [attr.aria-label]="etiqueta()"
      aria-haspopup="menu"
      [attr.aria-expanded]="abierto()"
      (click)="alternar($event)"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
      </svg>
    </button>
    @if (abierto()) {
      <div class="mo__lista" [class.mo__lista--arriba]="arriba()" role="menu" (click)="abierto.set(false)">
        <ng-content />
      </div>
    }
  `,
  styles: `
    :host { display: none; position: relative; text-align: right; }
    @media (max-width: 760px) { :host { display: block; } }
    .mo__btn {
      display: inline-grid;
      place-items: center;
      width: 2.4rem;
      height: 2.4rem;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--white);
      color: var(--ink);
      cursor: pointer;
    }
    .mo__btn svg { width: 1.15rem; height: 1.15rem; }
    .mo__lista {
      position: absolute;
      z-index: 20;
      right: 0;
      top: calc(100% + 0.25rem);
      display: flex;
      flex-direction: column;
      min-width: 11rem;
      padding: 0.3rem;
      border-radius: 12px;
      background: var(--white);
      box-shadow: 0 10px 30px rgba(9, 28, 38, 0.22), 0 0 0 1px var(--line);
    }
    .mo__lista--arriba { top: auto; bottom: calc(100% + 0.25rem); }
    :host ::ng-deep .mo__lista > * {
      display: block;
      width: 100%;
      height: auto;
      padding: 0.65rem 0.8rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--ink);
      font: inherit;
      font-size: var(--fs-sm);
      font-weight: 600;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      box-shadow: none;
    }
    :host ::ng-deep .mo__lista > *:hover:not(:disabled) { background: var(--teal-wash); }
    :host ::ng-deep .mo__lista > *:disabled { opacity: 0.4; cursor: default; }
    :host ::ng-deep .mo__lista > .peligro { color: var(--danger); }
  `,
})
export class MenuOpciones {
  readonly etiqueta = input('Opciones');
  /** Abre hacia arriba (filas del final, para que no lo corte el borde de la tabla). */
  readonly arriba = input(false);
  readonly abierto = signal(false);

  @HostListener('document:click') cerrar() {
    this.abierto.set(false);
  }
  alternar(ev: Event) {
    ev.stopPropagation();
    this.abierto.update((a) => !a);
  }
}
