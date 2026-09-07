import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import type { Categoria } from '../../../../core/models';

@Component({
  selector: 'app-admin-categorias-lista',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './categorias-lista.html',
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
