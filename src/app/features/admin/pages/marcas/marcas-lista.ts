import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarcasService } from '../../../../core/services/marcas.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import { TIPOS_ENLACE, type EnlaceMarca, type Marca } from '../../../../core/models';

@Component({
  selector: 'app-admin-marcas-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page-head">
        <h1>Marcas</h1>
      </div>

      <div class="admin-page__scroll">
        @if (error()) { <p class="error">{{ error() }}</p> }

        <fieldset class="panel marca-form">
          <legend>Nueva marca</legend>
          <div class="marca-grid">
            <label>Nombre
              <input [(ngModel)]="nueva.nombre" name="n-nombre" placeholder="Privas Travel" />
            </label>
            <label>Orden
              <input [(ngModel)]="nueva.orden" name="n-orden" type="number" />
            </label>
            <label class="ancho">Descripción
              <input [(ngModel)]="nueva.descripcion" name="n-desc" placeholder="Una línea sobre la marca (opcional)" />
            </label>
            <label class="ancho">Sitio web propio (CTA)
              <input [(ngModel)]="nueva.sitio_web_url" name="n-web" placeholder="https://privastravel.com" />
            </label>
            <label class="ancho">URL del logo
              <input [(ngModel)]="nueva.logo_url" name="n-logo" placeholder="https://… (opcional)" />
            </label>
          </div>

          <p class="lado-titulo">Redes sociales</p>
          @for (e of nueva.enlaces; track $index) {
            <div class="enlace-row">
              <select [(ngModel)]="e.tipo" [name]="'n-tipo-' + $index" aria-label="Tipo de red">
                @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
              </select>
              <input [(ngModel)]="e.url" [name]="'n-url-' + $index" placeholder="https://instagram.com/…" />
              <button type="button" class="secundario peligro" (click)="quitarEnlace(nueva, $index)">Quitar</button>
            </div>
          }
          <button type="button" class="secundario" (click)="agregarEnlace(nueva)">+ Red social</button>

          <div class="marca-form__pie">
            <button type="button" (click)="crear()">Agregar marca</button>
          </div>
        </fieldset>

        @for (m of marcas(); track m.id) {
          <fieldset class="panel marca-form">
            <legend>{{ m.nombre || 'Marca sin nombre' }}</legend>
            <div class="marca-grid">
              <label>Nombre
                <input [(ngModel)]="m.nombre" [name]="'nombre-' + m.id" />
              </label>
              <label>Orden
                <input [(ngModel)]="m.orden" [name]="'orden-' + m.id" type="number" />
              </label>
              <label class="ancho">Descripción
                <input [(ngModel)]="m.descripcion" [name]="'desc-' + m.id" placeholder="(opcional)" />
              </label>
              <label class="ancho">Sitio web propio (CTA)
                <input [(ngModel)]="m.sitio_web_url" [name]="'web-' + m.id" placeholder="https://… (opcional)" />
              </label>
              <label class="ancho">URL del logo
                <input [(ngModel)]="m.logo_url" [name]="'logo-' + m.id" placeholder="(opcional)" />
              </label>
            </div>

            <p class="lado-titulo">Redes sociales</p>
            @for (e of m.enlaces; track $index) {
              <div class="enlace-row">
                <select [(ngModel)]="e.tipo" [name]="'tipo-' + m.id + '-' + $index" aria-label="Tipo de red">
                  @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
                </select>
                <input [(ngModel)]="e.url" [name]="'url-' + m.id + '-' + $index" placeholder="https://…" />
                <button type="button" class="secundario peligro" (click)="quitarEnlace(m, $index)">Quitar</button>
              </div>
            } @empty {
              <p class="hint">Sin redes sociales.</p>
            }
            <button type="button" class="secundario" (click)="agregarEnlace(m)">+ Red social</button>

            <div class="marca-form__pie">
              <button type="button" class="secundario" (click)="guardar(m)">Guardar cambios</button>
              <button type="button" class="secundario peligro" (click)="eliminar(m)">Eliminar</button>
            </div>
          </fieldset>
        } @empty {
          <p class="hint">Sin marcas.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .marca-form { display: flex; flex-direction: column; gap: 0.7rem; }
    .marca-grid {
      display: grid;
      grid-template-columns: 1fr 5rem;
      gap: 0.6rem 0.8rem;
      align-items: end;
    }
    .marca-grid label { display: flex; flex-direction: column; gap: 0.25rem; margin: 0; font-size: var(--fs-sm); }
    .marca-grid label.ancho { grid-column: 1 / -1; }
    .marca-grid input { margin: 0; width: 100%; }
    .enlace-row {
      display: grid;
      grid-template-columns: 9rem 1fr auto;
      gap: 0.5rem;
      align-items: center;
    }
    .enlace-row select, .enlace-row input { margin: 0; }
    .enlace-row button, .marca-form__pie button { height: 2rem; padding-block: 0; }
    .marca-form__pie { display: flex; gap: 0.5rem; margin-top: 0.3rem; }
    @media (max-width: 640px) {
      .marca-grid { grid-template-columns: 1fr; }
      .enlace-row { grid-template-columns: 1fr; }
    }
  `,
})
export class MarcasLista implements OnInit {
  private readonly srv = inject(MarcasService);
  private readonly confirmar = inject(ConfirmService);
  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly tipos = TIPOS_ENLACE;

  nueva: Partial<Marca> = this.formVacio();

  ngOnInit() {
    this.cargar();
  }

  private formVacio(): Partial<Marca> {
    return {
      nombre: '',
      descripcion: '',
      sitio_web_url: '',
      logo_url: '',
      orden: 0,
      enlaces: [],
    };
  }

  private async cargar() {
    try {
      this.marcas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  agregarEnlace(m: Partial<Marca>) {
    (m.enlaces ??= []).push({ tipo: 'instagram', url: '' });
  }

  quitarEnlace(m: Partial<Marca>, i: number) {
    m.enlaces?.splice(i, 1);
  }

  async crear() {
    if (!this.nueva.nombre?.trim()) return this.error.set('Falta el nombre.');
    this.error.set('');
    try {
      await this.srv.crear(this.nueva);
      this.nueva = this.formVacio();
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async guardar(m: Marca) {
    this.error.set('');
    try {
      await this.srv.actualizar(m.id, {
        nombre: m.nombre,
        descripcion: m.descripcion,
        sitio_web_url: m.sitio_web_url,
        logo_url: m.logo_url,
        orden: m.orden,
        enlaces: m.enlaces as EnlaceMarca[],
      });
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async eliminar(m: Marca) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar la marca?',
      mensaje: `«${m.nombre}» dejará de aparecer en "Nuestras Marcas".`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await this.srv.eliminar(m.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
