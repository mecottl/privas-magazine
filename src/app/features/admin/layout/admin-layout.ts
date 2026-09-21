import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../core/services/errores';

/** Shell del panel de administración: sidebar (marca + navegación + sesión) + contenido. */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog, FormsModule],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private primeraCarga = true;

  /** Nombre visible del admin, o el correo si no tiene. */
  readonly nombre = computed(
    () => this.auth.perfil()?.nombre_visible || this.auth.user()?.email || '—',
  );
  /** Inicial para el avatar. */
  readonly inicial = computed(() => this.nombre().charAt(0).toUpperCase());
  readonly correo = computed(() => this.auth.user()?.email ?? '');

  readonly editandoNombre = signal(false);
  readonly guardandoNombre = signal(false);
  readonly errorNombre = signal('');
  nombreEditado = '';

  editarNombre() {
    this.nombreEditado = this.auth.perfil()?.nombre_visible ?? '';
    this.errorNombre.set('');
    this.editandoNombre.set(true);
  }

  cancelarEdicionNombre() {
    this.editandoNombre.set(false);
  }

  async guardarNombre() {
    const nombre = this.nombreEditado.trim();
    if (!nombre) {
      this.errorNombre.set('El nombre no puede quedar vacío.');
      return;
    }
    this.guardandoNombre.set(true);
    try {
      await this.auth.actualizarNombre(nombre);
      this.editandoNombre.set(false);
    } catch (e) {
      this.errorNombre.set(mensajeError(e));
    } finally {
      this.guardandoNombre.set(false);
    }
  }

  readonly cambiandoPassword = signal(false);
  readonly guardandoPassword = signal(false);
  readonly errorPassword = signal('');
  passwordNueva = '';
  passwordConfirmar = '';

  abrirCambioPassword() {
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.errorPassword.set('');
    this.cambiandoPassword.set(true);
  }

  cancelarCambioPassword() {
    this.cambiandoPassword.set(false);
  }

  async guardarPassword() {
    this.errorPassword.set('');
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
      this.cambiandoPassword.set(false);
    } catch (e) {
      this.errorPassword.set(mensajeError(e));
    } finally {
      this.guardandoPassword.set(false);
    }
  }

  async salir() {
    await this.auth.cerrarSesion();
    this.router.navigate(['/gestion-privas/login']);
  }

  alActivarRuta() {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return;
    }
    // La animación visual ya la da la View Transitions API (ver
    // app.config.ts) — esto solo mueve el foco a <main> para lectores de
    // pantalla al cambiar de ruta.
    this.main()?.nativeElement.focus({ preventScroll: true });
  }
}
