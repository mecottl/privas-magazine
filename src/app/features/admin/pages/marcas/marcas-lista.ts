import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarcasService } from '../../../../core/services/marcas.service';
import type { Marca } from '../../../../core/models';

@Component({
  selector: 'app-admin-marcas-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <h1>Marcas</h1>
      <p class="hint">
        La sección pública "Nuestras Marcas" lee de esta tabla (CLAUDE.md).
        Pendiente de confirmar con la clienta si se deja fija o administrable.
      </p>
      @if (error()) { <p class="error">{{ error() }}</p> }

      <form class="row" (ngSubmit)="crear()">
        <input [(ngModel)]="nueva.nombre" name="nombre" placeholder="Nombre" required />
        <input [(ngModel)]="nueva.red_social_url" name="url" placeholder="URL red social" required />
        <input [(ngModel)]="nueva.logo_url" name="logo" placeholder="URL logo (opcional)" />
        <input [(ngModel)]="nueva.orden" name="orden" type="number" placeholder="orden" />
        <button type="submit">Agregar</button>
      </form>

      <table>
        <thead><tr><th>Orden</th><th>Nombre</th><th>URL</th><th>Logo</th><th></th></tr></thead>
        <tbody>
          @for (m of marcas(); track m.id) {
            <tr>
              <td><input type="number" [(ngModel)]="m.orden" style="width:4rem" /></td>
              <td><input [(ngModel)]="m.nombre" /></td>
              <td><input [(ngModel)]="m.red_social_url" /></td>
              <td><input [(ngModel)]="m.logo_url" /></td>
              <td>
                <button (click)="guardar(m)">Guardar</button>
                <button (click)="eliminar(m)">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">Sin marcas.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class MarcasLista implements OnInit {
  private readonly srv = inject(MarcasService);
  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  nueva: Partial<Marca> = { nombre: '', red_social_url: '', logo_url: '', orden: 0 };

  ngOnInit() {
    this.cargar();
  }

  private async cargar() {
    try {
      this.marcas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(String(e));
    }
  }

  async crear() {
    try {
      await this.srv.crear(this.nueva);
      this.nueva = { nombre: '', red_social_url: '', logo_url: '', orden: 0 };
      await this.cargar();
    } catch (e) {
      this.error.set(String(e));
    }
  }

  async guardar(m: Marca) {
    try {
      await this.srv.actualizar(m.id, {
        nombre: m.nombre,
        red_social_url: m.red_social_url,
        logo_url: m.logo_url,
        orden: m.orden,
      });
    } catch (e) {
      this.error.set(String(e));
    }
  }

  async eliminar(m: Marca) {
    if (!confirm(`¿Eliminar "${m.nombre}"?`)) return;
    try {
      await this.srv.eliminar(m.id);
      await this.cargar();
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
