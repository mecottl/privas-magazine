import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { InfoTip } from '../../../../shared/components/info-tip/info-tip';
import { mensajeError } from '../../../../core/services/errores';
import type { Articulo, EdicionRevista } from '../../../../core/models';

/**
 * Papelera (issue #77): artículos y ediciones con `eliminado_en` no nulo.
 * Se purgan solos a los 30 días (`programar-publicacion`) o se pueden
 * restaurar/eliminar para siempre desde aquí.
 */
import { MenuOpciones } from '../../../../shared/components/menu-opciones/menu-opciones';

@Component({
  selector: 'app-admin-papelera-lista',
  standalone: true,
  imports: [DatePipe, InfoTip, MenuOpciones],
  templateUrl: './papelera-lista.html',
})
export class PapeleraLista implements OnInit {
  private readonly srvArticulos = inject(ArticulosService);
  private readonly srvEdiciones = inject(EdicionesService);
  private readonly confirmar = inject(ConfirmService);
  readonly auth = inject(AuthService);

  readonly articulos = signal<Articulo[]>([]);
  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  /** Un editor solo puede restaurar/purgar lo que él mismo creó. */
  puedeGestionar(a: Articulo): boolean {
    return this.auth.tieneAccesoTotal() || a.creado_por === this.auth.user()?.id;
  }

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      const [articulos, ediciones] = await Promise.all([
        this.srvArticulos.listarPapelera(),
        this.srvEdiciones.listarPapelera(),
      ]);
      this.articulos.set(articulos);
      this.ediciones.set(ediciones);
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  async restaurarArticulo(a: Articulo) {
    try {
      await this.srvArticulos.restaurar(a.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async eliminarArticuloDefinitivo(a: Articulo) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar para siempre?',
      mensaje: `«${a.titulo}» se borrará de forma permanente. No se puede deshacer.`,
      cta: 'Eliminar para siempre',
      peligro: true,
    });
    if (!ok) return;
    try {
      await this.srvArticulos.eliminarDefinitivo(a.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async restaurarEdicion(ed: EdicionRevista) {
    try {
      await this.srvEdiciones.restaurar(ed.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async eliminarEdicionDefinitivo(ed: EdicionRevista) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar para siempre?',
      mensaje: `«${ed.titulo}» se borrará de forma permanente. No se puede deshacer.`,
      cta: 'Eliminar para siempre',
      peligro: true,
    });
    if (!ok) return;
    try {
      await this.srvEdiciones.eliminarDefinitivo(ed.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
