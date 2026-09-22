import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BitacoraService } from '../../../../core/services/bitacora.service';
import { mensajeError } from '../../../../core/services/errores';
import type { BitacoraEntrada } from '../../../../core/models';

const NOMBRE_ACCION: Record<string, string> = {
  publicar: 'Publicó',
  despublicar: 'Despublicó',
  programar: 'Programó',
  regresar_a_borrador: 'Regresó a borrador',
  cambiar_estado: 'Cambió el estado',
  eliminar: 'Eliminó',
  invitar_admin: 'Invitó a un admin',
  eliminar_admin: 'Eliminó a un admin',
  gestionar_admin: 'Gestionó una cuenta de admin',
};

const NOMBRE_TABLA: Record<string, string> = {
  articulos: 'un artículo',
  ediciones_revista: 'una edición',
  perfiles_admin: 'una cuenta',
};

@Component({
  selector: 'app-admin-bitacora-lista',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './bitacora-lista.html',
})
export class BitacoraLista implements OnInit {
  private readonly srv = inject(BitacoraService);
  readonly entradas = signal<BitacoraEntrada[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);
  readonly nombreAccion = NOMBRE_ACCION;

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      this.entradas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  descripcion(e: BitacoraEntrada): string {
    const accion = this.nombreAccion[e.accion] ?? e.accion;
    const titulo = (e.detalle?.['titulo'] as string) ?? '';
    const tabla = e.tabla ? (NOMBRE_TABLA[e.tabla] ?? e.tabla) : '';
    if (titulo) return `${accion} ${tabla}: «${titulo}»`;
    if (e.accion === 'gestionar_admin') {
      const cambios = Object.keys(e.detalle ?? {}).join(', ');
      return `${accion} (${cambios})`;
    }
    return `${accion}${tabla ? ' en ' + tabla : ''}`;
  }
}
