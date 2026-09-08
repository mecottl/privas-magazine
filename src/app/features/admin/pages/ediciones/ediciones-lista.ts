import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { UploadsService } from '../../../../core/services/uploads.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
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
  templateUrl: './ediciones-lista.html',
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
      const subida = await this.uploads.subir(file, tipo);
      if (tipo === 'revista-pdf') {
        this.edit.pdf_url = subida.url;
        this.edit.pdf_path = subida.path;
        this.edit.pdf_target = subida.target;
      } else {
        this.edit.portada_url = subida.url;
        this.edit.portada_path = subida.path;
        this.edit.portada_target = subida.target;
      }
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
