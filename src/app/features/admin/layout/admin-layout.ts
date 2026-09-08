import {
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
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

  /** Nombre visible del admin, o el correo si no tiene. */
  readonly nombre = computed(
    () => this.auth.perfil()?.nombre_visible || this.auth.user()?.email || '—',
  );
  /** Inicial para el avatar. */
  readonly inicial = computed(() => this.nombre().charAt(0).toUpperCase());
  readonly correo = computed(() => this.auth.user()?.email ?? '');

  async salir() {
    await this.auth.cerrarSesion();
    this.router.navigate(['/gestion-privas/login']);
  }

  alActivarRuta() {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return;
    }
    const el = this.main()?.nativeElement;
    if (!el) return;
    el.classList.remove('ruta-entrando');
    void el.offsetWidth;
    el.classList.add('ruta-entrando');
    el.focus({ preventScroll: true });
  }
}
