import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BitacoraService } from '../../../../core/services/bitacora.service';
import { mensajeError } from '../../../../core/services/errores';
import { InfoTip } from '../../shared/info-tip/info-tip';
import { ConfirmService } from '../../shared/confirm-dialog/confirm-dialog';
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
  imports: [DatePipe, InfoTip],
  templateUrl: './bitacora-lista.html',
})
export class BitacoraLista implements OnInit {
  private readonly srv = inject(BitacoraService);
  private readonly confirmar = inject(ConfirmService);
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

  async eliminar(e: BitacoraEntrada) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar esta fila de la bitácora?',
      mensaje: 'No se puede deshacer.',
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await this.srv.eliminar(e.id);
      this.entradas.update((lista) => lista.filter((x) => x.id !== e.id));
    } catch (err) {
      this.error.set(mensajeError(err));
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
