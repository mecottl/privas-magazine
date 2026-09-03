import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrado',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page no-encontrado">
      <p class="eyebrow">Error 404</p>
      <h1>Esta página no existe (o ya no)</h1>
      <p class="no-encontrado__texto">
        El enlace puede estar roto o el contenido se movió. Desde aquí puedes seguir:
      </p>
      <div class="no-encontrado__acciones">
        <a routerLink="/" class="btn btn--primario">Ir al inicio</a>
        <a routerLink="/articulos" class="btn btn--fantasma">Ver los artículos</a>
      </div>
    </section>
  `,
  styles: `
    .no-encontrado {
      max-width: 640px;
      padding-block: var(--space-3xl);
    }
    .no-encontrado h1 {
      font-size: var(--fs-h1);
      margin-bottom: var(--space-md);
    }
    .no-encontrado__texto {
      color: var(--color-texto-medio);
      font-size: var(--fs-lead);
      margin-bottom: var(--space-xl);
    }
    .no-encontrado__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .no-encontrado .btn--fantasma:hover {
      color: var(--color-blanco);
    }
  `,
})
export class NoEncontrado {}
