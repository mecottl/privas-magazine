import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeError } from '../../../../core/services/errores';

/**
 * Verificación en dos pasos por correo (issue #17). Manda el código solo al
 * entrar aquí (no en cada tecleo) y deja reenviarlo. Al verificar, marca
 * este navegador como "confiable" 30 días — no vuelve a pedirlo hasta
 * entonces (ver `AuthService.mfaEsDispositivoConfiable`).
 *
 * Ruta hermana de `login`, fuera de `adminGuard` — si estuviera detrás del
 * guard se generaría un bucle de redirección contra sí misma.
 */
@Component({
  selector: 'app-verificar-mfa',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './verificar-mfa.html',
  styleUrl: '../login/login.scss',
})
export class VerificarMfa implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly correo = this.auth.user()?.email ?? '';
  codigo = '';
  readonly enviando = signal(true);
  readonly verificando = signal(false);
  readonly reenviado = signal(false);
  readonly error = signal('');

  async ngOnInit() {
    if (!this.auth.esAdmin()) {
      this.router.navigate(['/gestion-privas/login']);
      return;
    }
    await this.enviarCodigo();
  }

  async enviarCodigo() {
    this.error.set('');
    this.enviando.set(true);
    try {
      await this.auth.mfaEnviarCodigo();
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  async reenviar() {
    this.reenviado.set(false);
    await this.enviarCodigo();
    if (!this.error()) this.reenviado.set(true);
  }

  async confirmar() {
    this.error.set('');
    if (!/^\d{6}$/.test(this.codigo.trim())) {
      this.error.set('El código son 6 dígitos.');
      return;
    }
    this.verificando.set(true);
    try {
      await this.auth.mfaVerificarCodigo(this.codigo.trim());
      this.router.navigate(['/gestion-privas/dashboard']);
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.verificando.set(false);
    }
  }

  async salir() {
    await this.auth.cerrarSesion();
    this.router.navigate(['/gestion-privas/login']);
  }
}
