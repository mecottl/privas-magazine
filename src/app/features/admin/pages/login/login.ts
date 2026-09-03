import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-shell">
      <section class="auth-box">
        <p class="eyebrow">PRIVAS Magazine</p>
        <h1>Acceso a gestión</h1>
        <form (ngSubmit)="entrar()">
          <label>
            Correo
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
            />
          </label>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button type="submit" [disabled]="cargando()">
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </section>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly cargando = signal(false);
  readonly error = signal('');

  async entrar() {
    this.cargando.set(true);
    this.error.set('');
    const { error } = await this.auth.iniciarSesion(this.email, this.password);
    this.cargando.set(false);
    if (error) {
      this.error.set('Credenciales inválidas.');
      return;
    }
    if (!this.auth.esAdmin()) {
      this.error.set('Esta cuenta no tiene acceso de administración activo.');
      await this.auth.cerrarSesion();
      return;
    }
    this.router.navigate(['/gestion-privas/dashboard']);
  }
}
