import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminsService } from '../../../../core/services/admins.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { InfoTip } from '../../../../shared/components/info-tip/info-tip';
import { mensajeError } from '../../../../core/services/errores';
import {
  NIVELES_PERMISO,
  NOMBRE_NIVEL_PERMISO,
  type NivelPermiso,
  type PerfilAdmin,
} from '../../../../core/models';

@Component({
  selector: 'app-admin-administradores-lista',
  standalone: true,
  imports: [FormsModule, DatePipe, InfoTip],
  templateUrl: './administradores-lista.html',
})
export class AdministradoresLista implements OnInit {
  private readonly srv = inject(AdminsService);
  readonly auth = inject(AuthService);
  private readonly confirmar = inject(ConfirmService);
  readonly miId = () => this.auth.user()?.id ?? null;
  readonly admins = signal<PerfilAdmin[]>([]);
  readonly enviando = signal(false);
  readonly msg = signal('');
  readonly exito = signal(false);
  readonly niveles = NIVELES_PERMISO;
  readonly nombreNivel = NOMBRE_NIVEL_PERMISO;

  /** admin_total (no-dueño) solo puede invitar editores. */
  readonly nivelesInvitables = computed<NivelPermiso[]>(() =>
    this.auth.esDueno() ? NIVELES_PERMISO : ['editor'],
  );

  email = '';
  nombre = '';
  nivel: NivelPermiso = 'editor';

  ngOnInit() {
    this.cargar();
  }

  private async cargar() {
    try {
      this.admins.set(await this.srv.listar());
    } catch (e) {
      this.msg.set(mensajeError(e));
      this.exito.set(false);
    }
  }

  async invitar() {
    this.enviando.set(true);
    this.msg.set('');
    const res = await this.srv.invitar({
      email: this.email.trim(),
      nombre_visible: this.nombre.trim(),
      nivel_permiso: this.nivel,
    });
    this.enviando.set(false);
    this.exito.set(res.ok);
    this.msg.set(res.ok ? 'Invitación enviada.' : `Error: ${res.error}`);
    if (res.ok) {
      this.email = '';
      this.nombre = '';
      await this.cargar();
    }
  }

  /**
   * admin_total (no-dueño) solo gestiona (activar/desactivar/eliminar)
   * cuentas de editor; el dueño gestiona cualquiera. Nadie se gestiona a
   * sí mismo desde aquí — para eso está Configuración.
   */
  puedeGestionar(a: PerfilAdmin): boolean {
    if (a.id === this.miId()) return false;
    if (this.auth.esDueno()) return true;
    return this.auth.esAdminTotal() && a.nivel_permiso === 'editor';
  }

  /** Cambiar nivel o restablecer contraseña ajena: exclusivo del dueño. */
  puedeGestionarComoDueno(a: PerfilAdmin): boolean {
    return this.auth.esDueno() && a.id !== this.miId();
  }

  async toggle(a: PerfilAdmin) {
    if (!this.puedeGestionar(a)) return;
    const desactivar = a.activo;
    const ok = await this.confirmar.confirm({
      titulo: desactivar ? '¿Desactivar la cuenta?' : '¿Activar la cuenta?',
      mensaje: desactivar
        ? `«${a.nombre_visible || a.id}» perderá el acceso al panel.`
        : `«${a.nombre_visible || a.id}» podrá volver a entrar al panel.`,
      cta: desactivar ? 'Desactivar' : 'Activar',
      peligro: desactivar,
    });
    if (!ok) return;
    this.msg.set('');
    try {
      await this.srv.actualizar(a.id, { activo: !a.activo });
      this.exito.set(true);
      this.msg.set(`Cuenta ${desactivar ? 'desactivada' : 'activada'}.`);
      await this.cargar();
    } catch (e) {
      this.exito.set(false);
      this.msg.set(mensajeError(e));
    }
  }

  /** Nivel elegido en el <select> de cada fila mientras no se guarda. */
  readonly nivelEditado = signal<Record<string, NivelPermiso>>({});
  nivelPara(a: PerfilAdmin): NivelPermiso {
    return this.nivelEditado()[a.id] ?? a.nivel_permiso;
  }
  cambiarNivelEditado(a: PerfilAdmin, nivel: NivelPermiso) {
    this.nivelEditado.set({ ...this.nivelEditado(), [a.id]: nivel });
  }

  async guardarNivel(a: PerfilAdmin) {
    const nivel = this.nivelPara(a);
    if (nivel === a.nivel_permiso) return;
    this.msg.set('');
    try {
      await this.srv.actualizar(a.id, { nivel_permiso: nivel });
      this.exito.set(true);
      this.msg.set(`Permiso de «${a.nombre_visible || a.id}» actualizado.`);
      await this.cargar();
    } catch (e) {
      this.exito.set(false);
      this.msg.set(mensajeError(e));
    }
  }

  async eliminar(a: PerfilAdmin) {
    if (!this.puedeGestionar(a)) return;
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar esta cuenta?',
      mensaje: `«${a.nombre_visible || a.id}» perderá el acceso de forma permanente y no se puede deshacer. Sus artículos no se borran, quedan sin dueño.`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.msg.set('');
    try {
      await this.srv.actualizar(a.id, { eliminar: true });
      this.exito.set(true);
      this.msg.set(`Cuenta de «${a.nombre_visible || a.id}» eliminada.`);
      await this.cargar();
    } catch (e) {
      this.exito.set(false);
      this.msg.set(mensajeError(e));
    }
  }

  /** Restablecer contraseña ajena — exclusivo del dueño. */
  readonly restableciendoId = signal<string | null>(null);
  resetPassword = '';
  resetConfirmar = '';
  readonly guardandoReset = signal(false);

  abrirReset(a: PerfilAdmin) {
    this.restableciendoId.set(a.id);
    this.resetPassword = '';
    this.resetConfirmar = '';
    this.msg.set('');
  }

  cancelarReset() {
    this.restableciendoId.set(null);
  }

  async guardarReset(a: PerfilAdmin) {
    this.msg.set('');
    if (this.resetPassword.length < 8) {
      this.exito.set(false);
      this.msg.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.resetPassword !== this.resetConfirmar) {
      this.exito.set(false);
      this.msg.set('Las contraseñas no coinciden.');
      return;
    }
    this.guardandoReset.set(true);
    try {
      await this.srv.actualizar(a.id, { password: this.resetPassword });
      this.exito.set(true);
      this.msg.set(`Contraseña de «${a.nombre_visible || a.id}» restablecida.`);
      this.restableciendoId.set(null);
    } catch (e) {
      this.exito.set(false);
      this.msg.set(mensajeError(e));
    } finally {
      this.guardandoReset.set(false);
    }
  }
}
