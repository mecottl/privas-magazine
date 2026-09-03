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
    <section class="page">
      <h1>Categorías</h1>

      <form class="row" (ngSubmit)="crear()">
        <input name="nombre" [(ngModel)]="nuevoNombre" placeholder="Nombre" required />
        <span class="hint">slug: {{ nuevoNombre ? slug(nuevoNombre) : '—' }}</span>
        <button type="submit" [disabled]="!nuevoNombre.trim()">Crear</button>
      </form>

      @if (error()) { <p class="error">{{ error() }}</p> }

      <table>
        <thead><tr><th>Nombre</th><th>Slug</th><th></th></tr></thead>
        <tbody>
          @for (c of categorias(); track c.id) {
            <tr>
              <td><input [(ngModel)]="c.nombre" /></td>
              <td><input [(ngModel)]="c.slug" /></td>
              <td>
                <button (click)="guardar(c)">Guardar</button>
                <button (click)="eliminar(c)">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="3">Sin categorías.</td></tr>
          }
        </tbody>
      </table>
    </section>
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
