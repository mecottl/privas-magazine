import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { UploadsService } from '../../../../core/services/uploads.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import {
  ESTADOS,
  TEMPORADAS,
  type EdicionRevista,
  type EstadoPublicacion,
} from '../../../../core/models';

type Accion = 'publicado' | 'despublicado' | 'eliminar';

@Component({
  selector: 'app-admin-ediciones-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page-head">
        <h1>Ediciones de revista</h1>
        @if (edit.id) {
          <div class="admin-page-head__acciones">
            <button class="secundario" (click)="nuevo()">Cancelar edición</button>
          </div>
        }
      </div>

      <div class="admin-page__scroll">
        @if (error()) { <p class="error">{{ error() }}</p> }

        <fieldset class="panel">
          <legend>{{ edit.id ? 'Editar edición' : 'Nueva edición' }}</legend>
          <div class="campos-grid">
            <label>Título <input [(ngModel)]="edit.titulo" /></label>
            <label>Temporada
              <select [(ngModel)]="edit.temporada">
                @for (t of temporadas; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </label>
            <label>Año <input type="number" [(ngModel)]="edit.anio" /></label>
            <label>Estado
              <select [(ngModel)]="edit.estado">
                @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
              </select>
            </label>
            <label>PDF
              <input type="file" accept="application/pdf" (change)="subir($event, 'revista-pdf')" />
              @if (edit.pdf_url) { <span class="hint">PDF cargado</span> }
            </label>
            <label>Portada
              <input type="file" accept="image/*" (change)="subir($event, 'revista-portada')" />
              @if (edit.portada_url) { <span class="hint">Portada cargada</span> }
            </label>
            @if (edit.estado === 'programado' || edit.estado === 'publicado') {
              <label>Fecha de publicación
                <input type="datetime-local" [(ngModel)]="fechaLocal" />
              </label>
            }
          </div>
          @if (subiendo()) { <p class="hint">Subiendo…</p> }
          <div class="row" style="margin-bottom:0">
            <button (click)="guardar()" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : 'Guardar edición' }}
            </button>
          </div>
        </fieldset>

        <div class="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th><th>Temporada</th><th>Año</th><th>Estado</th>
                <th class="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (ed of ediciones(); track ed.id) {
                <tr>
                  <td>{{ ed.titulo }}</td>
                  <td>{{ ed.temporada }}</td>
                  <td>{{ ed.anio }}</td>
                  <td><span class="badge badge--{{ ed.estado }}">{{ ed.estado }}</span></td>
                  <td class="col-acciones">
                    <div class="acciones">
                      <button class="secundario" (click)="cargarEnForm(ed)">Editar</button>
                      <select #sel aria-label="Más acciones" (change)="ejecutar(ed, sel.value); sel.value = ''">
                        <option value="" selected>Acciones…</option>
                        @if (ed.pdf_url) { <option value="pdf">Ver PDF</option> }
                        @if (ed.estado !== 'publicado') { <option value="publicado">Publicar</option> }
                        @if (ed.estado === 'publicado') { <option value="despublicado">Despublicar</option> }
                        <option value="eliminar">Eliminar</option>
                      </select>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5"><div class="admin-empty">Sin ediciones.</div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: `
    .campos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0 var(--space-lg);
    }
  `,
})
export class EdicionesLista implements OnInit {
  private readonly srv = inject(EdicionesService);
  private readonly uploads = inject(UploadsService);
  private readonly confirmar = inject(ConfirmService);

  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly guardando = signal(false);
  readonly subiendo = signal(false);
  readonly estados = ESTADOS;
  readonly temporadas = TEMPORADAS;

  edit: Partial<EdicionRevista> = this.vacio();
  fechaLocal = '';

  ngOnInit() {
    this.cargar();
  }

  private vacio(): Partial<EdicionRevista> {
    return {
      titulo: '',
      temporada: 'primavera-verano',
      anio: new Date().getFullYear(),
      pdf_url: '',
      portada_url: '',
      estado: 'borrador',
    };
  }

  nuevo() {
    this.edit = this.vacio();
    this.fechaLocal = '';
  }

  cargarEnForm(ed: EdicionRevista) {
    this.edit = { ...ed };
    this.fechaLocal = ed.fecha_publicacion
      ? new Date(ed.fecha_publicacion).toISOString().slice(0, 16)
      : '';
  }

  async cargar() {
    try {
      this.ediciones.set(await this.srv.listarAdmin());
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async subir(ev: Event, tipo: 'revista-pdf' | 'revista-portada') {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.subiendo.set(true);
    this.error.set('');
    try {
      const url = await this.uploads.subir(file, tipo);
      if (tipo === 'revista-pdf') this.edit.pdf_url = url;
      else this.edit.portada_url = url;
    } catch (e) {
      this.error.set(`Subida: ${mensajeError(e)}`);
    } finally {
      this.subiendo.set(false);
    }
  }

  async guardar() {
    this.error.set('');
    if (!this.edit.titulo?.trim()) return this.error.set('Falta el título.');
    if (!this.edit.pdf_url || !this.edit.portada_url) {
      return this.error.set('Sube el PDF y la portada antes de guardar.');
    }
    const payload: Partial<EdicionRevista> = {
      ...this.edit,
      fecha_publicacion:
        this.edit.estado === 'programado' || this.edit.estado === 'publicado'
          ? this.fechaLocal
            ? new Date(this.fechaLocal).toISOString()
            : new Date().toISOString()
          : null,
    };
    this.guardando.set(true);
    try {
      if (this.edit.id) await this.srv.actualizar(this.edit.id, payload);
      else await this.srv.crear(payload);
      this.nuevo();
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  async ejecutar(ed: EdicionRevista, valor: string) {
    const accion = valor as Accion | 'pdf' | '';
    if (!accion) return;
    if (accion === 'pdf') {
      window.open(ed.pdf_url, '_blank', 'noopener');
      return;
    }
    this.error.set('');
    try {
      if (accion === 'eliminar') {
        const ok = await this.confirmar.confirm({
          titulo: '¿Eliminar la edición?',
          mensaje: `«${ed.titulo}» se borrará de forma permanente.`,
          cta: 'Eliminar',
          peligro: true,
        });
        if (!ok) return;
        await this.srv.eliminar(ed.id);
      } else {
        await this.srv.cambiarEstado(ed.id, accion as EstadoPublicacion);
      }
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
