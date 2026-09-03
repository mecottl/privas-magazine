import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { UploadsService } from '../../../../core/services/uploads.service';
import {
  ESTADOS,
  TEMPORADAS,
  type EdicionRevista,
  type EstadoPublicacion,
} from '../../../../core/models';

@Component({
  selector: 'app-admin-ediciones-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page-head">
      <div>
        <h1>Ediciones de revista</h1>
        <p>{{ ediciones().length }} ediciones · PDF + portada obligatorios para guardar</p>
      </div>
      @if (edit.id) {
        <div class="admin-page-head__acciones">
          <button class="secundario" (click)="nuevo()">Cancelar edición</button>
        </div>
      }
    </div>

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
        <label>PDF de la edición
          <input type="file" accept="application/pdf" (change)="subir($event, 'revista-pdf')" />
          <span class="hint">{{ edit.pdf_url ? 'PDF cargado' : 'sin PDF' }}</span>
        </label>
        <label>Portada
          <input type="file" accept="image/*" (change)="subir($event, 'revista-portada')" />
          <span class="hint">{{ edit.portada_url ? 'portada cargada' : 'sin portada' }}</span>
        </label>
        @if (edit.estado === 'programado' || edit.estado === 'publicado') {
          <label>Fecha de publicación
            <input type="datetime-local" [(ngModel)]="fechaLocal" />
          </label>
        }
      </div>
      @if (subiendo()) { <p class="hint">Subiendo archivo…</p> }
      <div class="row" style="margin-bottom:0">
        <button (click)="guardar()" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar edición' }}
        </button>
      </div>
    </fieldset>

    <div class="tabla-wrap">
      <table>
        <thead><tr><th>Título</th><th>Temporada</th><th>Año</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          @for (ed of ediciones(); track ed.id) {
            <tr>
              <td>{{ ed.titulo }}</td>
              <td>{{ ed.temporada }}</td>
              <td>{{ ed.anio }}</td>
              <td><span class="badge badge--{{ ed.estado }}">{{ ed.estado }}</span></td>
              <td class="acciones">
                <button class="secundario" (click)="cargarEnForm(ed)">Editar</button>
                @if (ed.pdf_url) {
                  <a [href]="ed.pdf_url" target="_blank" rel="noopener"><button class="secundario">Ver PDF</button></a>
                }
                @if (ed.estado !== 'publicado') {
                  <button class="secundario" (click)="estado(ed, 'publicado')">Publicar</button>
                }
                @if (ed.estado === 'publicado') {
                  <button class="secundario" (click)="estado(ed, 'despublicado')">Despublicar</button>
                }
                <button class="secundario peligro" (click)="eliminar(ed)">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5"><div class="admin-empty">Sin ediciones todavía.</div></td></tr>
          }
        </tbody>
      </table>
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
      this.error.set(String(e));
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
      this.error.set(`Subida: ${e}`);
    } finally {
      this.subiendo.set(false);
    }
  }

  async guardar() {
    this.error.set('');
    if (!this.edit.titulo?.trim()) return this.error.set('Falta el título.');
    if (!this.edit.pdf_url || !this.edit.portada_url) {
      return this.error.set('PDF y portada son obligatorios (súbelos primero).');
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
      this.error.set(String(e));
    } finally {
      this.guardando.set(false);
    }
  }

  async estado(ed: EdicionRevista, e: EstadoPublicacion) {
    try {
      await this.srv.cambiarEstado(ed.id, e);
      await this.cargar();
    } catch (err) {
      this.error.set(String(err));
    }
  }

  async eliminar(ed: EdicionRevista) {
    if (!confirm(`¿Eliminar "${ed.titulo}"?`)) return;
    try {
      await this.srv.eliminar(ed.id);
      await this.cargar();
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
