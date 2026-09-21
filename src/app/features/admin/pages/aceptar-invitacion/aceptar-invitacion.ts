import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../../core/supabase/supabase.client';

/**
 * Página de aceptación de invitación (issue #61).
 *
 * `invitar-admin` crea la cuenta con `auth.admin.inviteUserByEmail()` y
 * manda el correo con `redirectTo` apuntando aquí. El cliente de Supabase
 * (`detectSessionInUrl: true`) ya procesó el token del link al cargar la
 * app, así que para cuando este componente monta, si el link era válido,
 * ya hay una sesión activa — solo falta que la persona ponga su propia
 * contraseña (la cuenta se crea sin una).
 *
 * Ruta SIN `adminGuard`: como `perfiles_admin` ya queda `activo: true`
 * desde que se invita (no espera a que se ponga contraseña), el guard
 * dejaría pasar directo al dashboard sin pedir contraseña nunca — por
 * eso esta pantalla vive aparte, como `login`.
 */
@Component({
  selector: 'app-aceptar-invitacion',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './aceptar-invitacion.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AceptarInvitacion implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  password = '';
  confirmar = '';
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly sinSesion = signal(false);
  readonly correo = signal('');
  readonly listo = signal(false);

  async ngOnInit() {
    // Si el link venció o ya se usó, Supabase deja el error en el hash
    // (#error=access_denied&error_code=otp_expired&...) y NO crea una
    // sesión nueva — pero si el navegador ya tenía una sesión previa
    // guardada (de otra cuenta, o de una visita anterior), `getSession()`
    // la devuelve igual. Sin este chequeo, esta pantalla mostraba el correo
    // de esa sesión vieja y dejaba "crear contraseña" para ESA cuenta, sin
    // relación alguna con el link que se acababa de abrir — un enlace
    // vencido terminaba pisando la contraseña de quien fuera que ya
    // estuviera logueado en ese navegador. Por eso el hash se revisa ANTES
    // de mirar la sesión, y un error ahí corta el flujo de una vez.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('error')) {
      this.sinSesion.set(true);
      return;
    }

    const { data } = await this.supabase.client.auth.getSession();
    if (!data.session) {
      this.sinSesion.set(true);
      return;
    }
    this.correo.set(data.session.user.email ?? '');
  }

  async confirmarClic() {
    this.error.set('');
    if (this.password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.password !== this.confirmar) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.cargando.set(true);
    const { error } = await this.supabase.client.auth.updateUser({
      password: this.password,
    });
    this.cargando.set(false);
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.listo.set(true);
    setTimeout(() => this.router.navigate(['/gestion-privas/dashboard']), 1200);
  }
}
