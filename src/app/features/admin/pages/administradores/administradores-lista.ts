import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminsService } from '../../../../core/services/admins.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  NIVELES_PERMISO,
  type NivelPermiso,
  type PerfilAdmin,
} from '../../../../core/models';

@Component({
  selector: 'app-admin-administradores-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <h1>Administradores</h1>

      <fieldset>
        <legend>Invitar administrador</legend>
        <p class="hint">
          Llama a la Edge Function <code>invitar-admin</code>: crea el usuario en
          Auth, le envía el correo de invitación de Supabase e inserta su perfil.
        </p>
        <label>Correo <input type="email" [(ngModel)]="email" name="email" /></label>
        <label>Nombre visible <input [(ngModel)]="nombre" name="nombre" /></label>
        <label>Nivel de permiso
          <select [(ngModel)]="nivel" name="nivel">
            @for (n of niveles; track n) { <option [value]="n">{{ n }}</option> }
          </select>
        </label>
        <button (click)="invitar()" [disabled]="enviando()">
          {{ enviando() ? 'Enviando…' : 'Enviar invitación' }}
        </button>
        @if (msg()) { <p [class.error]="!exito()" [class.ok]="exito()">{{ msg() }}</p> }
      </fieldset>

      <table>
        <thead><tr><th>Nombre</th><th>Nivel</th><th>Activo</th><th>Alta</th><th></th></tr></thead>
        <tbody>
          @for (a of admins(); track a.id) {
            <tr>
              <td>
                {{ a.nombre_visible || a.id }}
                @if (a.id === miId()) { <strong>(tú)</strong> }
              </td>
              <td>{{ a.nivel_permiso }}</td>
              <td>{{ a.activo ? 'sí' : 'no' }}</td>
              <td>{{ a.created_at }}</td>
              <td>
                @if (a.id === miId()) {
                  <span class="hint">tu propia cuenta</span>
                } @else {
                  <button (click)="toggle(a)">
                    {{ a.activo ? 'Desactivar' : 'Activar' }}
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">Sin administradores.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class AdministradoresLista implements OnInit {
  private readonly srv = inject(AdminsService);
  private readonly auth = inject(AuthService);
  readonly miId = () => this.auth.user()?.id ?? null;
  readonly admins = signal<PerfilAdmin[]>([]);
  readonly enviando = signal(false);
  readonly msg = signal('');
  readonly exito = signal(false);
  readonly niveles = NIVELES_PERMISO;

  email = '';
  nombre = '';
  nivel: NivelPermiso = 'admin_total';

  ngOnInit() {
    this.cargar();
  }

  private async cargar() {
    try {
      this.admins.set(await this.srv.listar());
    } catch (e) {
      this.msg.set(String(e));
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

  async toggle(a: PerfilAdmin) {
    if (a.id === this.miId()) return; // candado extra en el cliente
    const accion = a.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿${accion} a "${a.nombre_visible || a.id}"?`)) return;
    this.msg.set('');
    try {
      await this.srv.cambiarActivo(a.id, !a.activo);
      this.exito.set(true);
      this.msg.set(`Cuenta ${a.activo ? 'desactivada' : 'activada'}.`);
      await this.cargar();
    } catch (e) {
      this.exito.set(false);
      this.msg.set(e instanceof Error ? e.message : String(e));
    }
  }
}
