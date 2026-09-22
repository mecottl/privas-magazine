import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

/** Shell del panel de administración: sidebar (marca + navegación + sesión) + contenido. */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private primeraCarga = true;

  /** Sidebar como menú de hamburguesa en mobile (issue #80). */
  readonly menuAbierto = signal(false);
  toggleMenu() {
    this.menuAbierto.update((v) => !v);
  }
  cerrarMenu() {
    this.menuAbierto.set(false);
  }

  /** Nombre visible del admin, o el correo si no tiene. */
  readonly nombre = computed(
    () => this.auth.perfil()?.nombre_visible || this.auth.user()?.email || 'Admin',
  );
  /** Inicial para el avatar. */
  readonly inicial = computed(() => this.nombre().charAt(0).toUpperCase());
  readonly correo = computed(() => this.auth.user()?.email ?? '');

  async salir() {
    await this.auth.cerrarSesion();
    this.router.navigate(['/gestion-privas/login']);
  }

  alActivarRuta() {
    this.cerrarMenu();
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
