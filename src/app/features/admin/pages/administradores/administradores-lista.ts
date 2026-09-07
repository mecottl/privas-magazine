import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminsService } from '../../../../core/services/admins.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import {
  NIVELES_PERMISO,
  type NivelPermiso,
  type PerfilAdmin,
} from '../../../../core/models';

@Component({
  selector: 'app-admin-administradores-lista',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './administradores-lista.html',
  styleUrl: './administradores-lista.scss',
})
export class AdministradoresLista implements OnInit {
  private readonly srv = inject(AdminsService);
  private readonly auth = inject(AuthService);
  private readonly confirmar = inject(ConfirmService);
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

  async toggle(a: PerfilAdmin) {
    if (a.id === this.miId()) return;
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
      await this.srv.cambiarActivo(a.id, !a.activo);
      this.exito.set(true);
      this.msg.set(`Cuenta ${desactivar ? 'desactivada' : 'activada'}.`);
      await this.cargar();
    } catch (e) {
      this.exito.set(false);
      this.msg.set(mensajeError(e));
    }
  }
}
