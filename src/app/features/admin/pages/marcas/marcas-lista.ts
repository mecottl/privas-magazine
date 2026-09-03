import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarcasService } from '../../../../core/services/marcas.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import type { Marca } from '../../../../core/models';

@Component({
  selector: 'app-admin-marcas-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page-head">
        <h1>Marcas</h1>
      </div>

      <div class="admin-page__scroll">
        @if (error()) { <p class="error">{{ error() }}</p> }

        <fieldset class="panel">
          <legend>Nueva marca</legend>
          <form class="row" (ngSubmit)="crear()" style="margin:0">
            <input [(ngModel)]="nueva.nombre" name="nombre" placeholder="Nombre" required />
            <input [(ngModel)]="nueva.red_social_url" name="url" placeholder="URL red social" required />
            <input [(ngModel)]="nueva.logo_url" name="logo" placeholder="URL del logo (opcional)" />
            <input [(ngModel)]="nueva.orden" name="orden" type="number" placeholder="Orden" style="width:5rem" />
            <button type="submit">Agregar</button>
          </form>
        </fieldset>

        <div class="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:4.5rem">Orden</th><th>Nombre</th><th>URL</th><th>Logo</th>
                <th class="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (m of marcas(); track m.id) {
                <tr>
                  <td><input type="number" [(ngModel)]="m.orden" aria-label="Orden" /></td>
                  <td><input [(ngModel)]="m.nombre" aria-label="Nombre" /></td>
                  <td><input [(ngModel)]="m.red_social_url" aria-label="URL" /></td>
                  <td><input [(ngModel)]="m.logo_url" aria-label="Logo" /></td>
                  <td class="col-acciones">
                    <div class="acciones">
                      <button class="secundario" (click)="guardar(m)">Guardar</button>
                      <button class="secundario peligro" (click)="eliminar(m)">Eliminar</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5"><div class="admin-empty">Sin marcas.</div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class MarcasLista implements OnInit {
  private readonly srv = inject(MarcasService);
  private readonly confirmar = inject(ConfirmService);
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
      this.error.set(mensajeError(e));
    }
  }

  async crear() {
    try {
      await this.srv.crear(this.nueva);
      this.nueva = { nombre: '', red_social_url: '', logo_url: '', orden: 0 };
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
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
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async eliminar(m: Marca) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar la marca?',
      mensaje: `«${m.nombre}» dejará de aparecer en "Nuestras Marcas".`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await this.srv.eliminar(m.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
