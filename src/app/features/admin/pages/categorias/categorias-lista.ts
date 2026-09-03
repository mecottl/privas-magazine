import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { slugify } from '../../../../core/services/slug';
import type { Categoria } from '../../../../core/models';

@Component({
  selector: 'app-admin-categorias-lista',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page-head">
      <div>
        <h1>Categorías</h1>
        <p>{{ categorias().length }} categorías · usadas para clasificar y filtrar artículos</p>
      </div>
    </div>

    <fieldset class="panel">
      <legend>Nueva categoría</legend>
      <form class="row" (ngSubmit)="crear()">
        <input name="nombre" [(ngModel)]="nuevoNombre" placeholder="Nombre" required />
        <span class="hint">slug: {{ nuevoNombre ? slug(nuevoNombre) : '—' }}</span>
        <button type="submit" [disabled]="!nuevoNombre.trim()">Crear</button>
      </form>
    </fieldset>

    @if (error()) { <p class="error">{{ error() }}</p> }

    <div class="tabla-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Slug</th><th></th></tr></thead>
        <tbody>
          @for (c of categorias(); track c.id) {
            <tr>
              <td><input [(ngModel)]="c.nombre" aria-label="Nombre" /></td>
              <td><input [(ngModel)]="c.slug" aria-label="Slug" /></td>
              <td class="acciones">
                <button class="secundario" (click)="guardar(c)">Guardar</button>
                <button class="secundario peligro" (click)="eliminar(c)">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="3"><div class="admin-empty">Sin categorías todavía.</div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CategoriasLista implements OnInit {
  private readonly srv = inject(CategoriasService);
  readonly categorias = signal<Categoria[]>([]);
  readonly error = signal('');
  nuevoNombre = '';
  slug = slugify;

  ngOnInit() {
    this.cargar();
  }

  private async cargar() {
    try {
      this.categorias.set(await this.srv.listar());
    } catch (e) {
      this.error.set(String(e));
    }
  }

  async crear() {
    try {
      await this.srv.crear(this.nuevoNombre);
      this.nuevoNombre = '';
      await this.cargar();
    } catch (e) {
      this.error.set(String(e));
    }
  }

  async guardar(c: Categoria) {
    try {
      await this.srv.actualizar(c.id, { nombre: c.nombre, slug: c.slug });
    } catch (e) {
      this.error.set(String(e));
    }
  }

  async eliminar(c: Categoria) {
    if (!confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try {
      await this.srv.eliminar(c.id);
      await this.cargar();
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
