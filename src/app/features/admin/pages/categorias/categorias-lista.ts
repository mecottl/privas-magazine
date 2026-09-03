import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import type { Categoria } from '../../../../core/models';

@Component({
  selector: 'app-admin-categorias-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page-head">
        <h1>Categorías</h1>
      </div>

      <div class="admin-page__scroll">
        <fieldset class="panel">
          <legend>Nueva categoría</legend>
          <form class="row" (ngSubmit)="crear()" style="margin:0">
            <input name="nombre" [(ngModel)]="nuevoNombre" placeholder="Nombre" required />
            <button type="submit" [disabled]="!nuevoNombre.trim()">Crear</button>
          </form>
        </fieldset>

        @if (error()) { <p class="error">{{ error() }}</p> }

        <div class="tabla-wrap">
          <table>
            <thead><tr><th>Nombre</th><th class="col-acciones">Acciones</th></tr></thead>
            <tbody>
              @for (c of categorias(); track c.id) {
                <tr>
                  <td><input [(ngModel)]="c.nombre" aria-label="Nombre" /></td>
                  <td class="col-acciones">
                    <div class="acciones">
                      <button class="secundario" (click)="guardar(c)">Guardar</button>
                      <button class="secundario peligro" (click)="eliminar(c)">Eliminar</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="2"><div class="admin-empty">Sin categorías.</div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class CategoriasLista implements OnInit {
  private readonly srv = inject(CategoriasService);
  private readonly confirmar = inject(ConfirmService);
  readonly categorias = signal<Categoria[]>([]);
  readonly error = signal('');
  nuevoNombre = '';

  ngOnInit() {
    this.cargar();
  }

  private async cargar() {
    try {
      this.categorias.set(await this.srv.listar());
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async crear() {
    if (!this.nuevoNombre.trim()) return;
    try {
      await this.srv.crear(this.nuevoNombre);
      this.nuevoNombre = '';
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async guardar(c: Categoria) {
    try {
      await this.srv.actualizar(c.id, { nombre: c.nombre });
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async eliminar(c: Categoria) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar la categoría?',
      mensaje: `«${c.nombre}» se quitará de todos los artículos que la usen.`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await this.srv.eliminar(c.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
