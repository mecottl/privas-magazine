import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeError } from '../../../../core/services/errores';
import { NOMBRE_NIVEL_PERMISO } from '../../../../core/models';

/** Cuenta propia: nombre visible, contraseña y MFA — antes vivía suelto en el sidebar. */
@Component({
  selector: 'app-admin-configuracion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './configuracion.html',
})
export class Configuracion {
  readonly auth = inject(AuthService);
  readonly nombreNivel = NOMBRE_NIVEL_PERMISO;

  nombre = this.auth.perfil()?.nombre_visible ?? '';
  readonly guardandoNombre = signal(false);
  readonly errorNombre = signal('');
  readonly okNombre = signal(false);

  async guardarNombre() {
    this.errorNombre.set('');
    this.okNombre.set(false);
    const nombre = this.nombre.trim();
    if (!nombre) {
      this.errorNombre.set('El nombre no puede quedar vacío.');
      return;
    }
    this.guardandoNombre.set(true);
    try {
      await this.auth.actualizarNombre(nombre);
      this.okNombre.set(true);
    } catch (e) {
      this.errorNombre.set(mensajeError(e));
    } finally {
      this.guardandoNombre.set(false);
    }
  }

  passwordNueva = '';
  passwordConfirmar = '';
  readonly guardandoPassword = signal(false);
  readonly errorPassword = signal('');
  readonly okPassword = signal(false);

  async guardarPassword() {
    this.errorPassword.set('');
    this.okPassword.set(false);
    if (this.passwordNueva.length < 8) {
      this.errorPassword.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.errorPassword.set('Las contraseñas no coinciden.');
      return;
    }
    this.guardandoPassword.set(true);
    try {
      await this.auth.actualizarPassword(this.passwordNueva);
      this.passwordNueva = '';
      this.passwordConfirmar = '';
      this.okPassword.set(true);
    } catch (e) {
      this.errorPassword.set(mensajeError(e));
    } finally {
      this.guardandoPassword.set(false);
    }
  }

  readonly guardandoMfa = signal(false);
  readonly errorMfa = signal('');

  async cambiarMfa(activo: boolean) {
    this.errorMfa.set('');
    this.guardandoMfa.set(true);
    try {
      await this.auth.mfaActivarParaMiCuenta(activo);
    } catch (e) {
      this.errorMfa.set(mensajeError(e));
    } finally {
      this.guardandoMfa.set(false);
    }
  }
}
