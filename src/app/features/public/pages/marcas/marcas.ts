import { Component, OnInit, inject, signal } from '@angular/core';
import { MarcasService } from '../../../../core/services/marcas.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { mensajeError } from '../../../../core/services/errores';
import type { EnlaceMarca, Marca } from '../../../../core/models';

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
        <ul class="marcas-fichas" aria-hidden="true">
          @for (n of [1, 2, 3]; track n) {
            <li class="marca-ficha">
              <div class="sk" style="width:64px;height:64px;border-radius:12px"></div>
              <div class="sk sk--line" style="width:55%;margin-top:.7rem"></div>
              <div class="sk sk--line" style="width:80%"></div>
            </li>
          }
        </ul>
      } @else {
        <ul class="marcas-fichas" data-reveal-stagger>
          @for (m of marcas(); track m.id) {
            <li class="marca-ficha" reveal>
              @if (m.logo_url) { <img [src]="m.logo_url" [alt]="m.nombre" loading="lazy" /> }
              <h2>{{ m.nombre }}</h2>
              @if (m.descripcion) { <p>{{ m.descripcion }}</p> }

              @if (m.sitio_web_url) {
                <a class="marca-cta" [href]="m.sitio_web_url" target="_blank" rel="noopener">
                  Visitar sitio →
                </a>
              }

              @if (enlaces(m).length) {
                <div class="marca-redes">
                  @for (e of enlaces(m); track e.url) {
                    <a [href]="e.url" target="_blank" rel="noopener">{{ etiqueta(e) }}</a>
                  }
                </div>
              }
            </li>
          } @empty {
            <li class="indice-vacio">Aún no hay marcas para mostrar.</li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .marcas-fichas {
      list-style: none;
      margin: var(--space-lg) 0 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-md);
    }
    .marca-ficha {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
      padding: var(--space-md);
      border: 1px solid var(--line);
      border-radius: var(--radio, 4px);
      background: var(--paper-2, #fff);
    }
    .marca-ficha img {
      width: 64px; height: 64px;
      object-fit: contain;
      margin-bottom: 0.2rem;
    }
    .marca-ficha h2 {
      font-size: var(--fs-lg);
      font-weight: 500;
      margin: 0;
    }
    .marca-ficha p {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--ink-55);
    }
    .marca-cta {
      margin-top: 0.3rem;
      font-weight: 600;
      font-size: var(--fs-sm);
      border-bottom: 1px solid var(--teal);
      padding-bottom: 1px;
    }
    .marca-cta:hover { color: var(--teal-ink); }
    .marca-redes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.9rem;
      margin-top: 0.4rem;
    }
    .marca-redes a {
      font-size: var(--fs-xs, 0.8rem);
      text-transform: capitalize;
      color: var(--ink-55);
    }
    .marca-redes a:hover { color: var(--teal-ink); }
  `,
})
export class Marcas implements OnInit {
  private readonly srv = inject(MarcasService);
  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  enlaces(m: Marca): EnlaceMarca[] {
    return (m.enlaces ?? []).filter((e) => e.url);
  }

  etiqueta(e: EnlaceMarca): string {
    return e.tipo === 'x' ? 'X' : e.tipo || 'enlace';
  }

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
