import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarcasService } from '../../../../core/services/marcas.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import type { Marca } from '../../../../core/models';

@Component({
  selector: 'app-admin-marcas-lista',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './marcas-lista.html',
})
export class MarcasLista implements OnInit {
  private readonly srv = inject(MarcasService);
  private readonly confirmar = inject(ConfirmService);

  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.marcas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminar(m: Marca) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar la marca?',
      mensaje: `«${m.nombre}» dejará de aparecer en "Nuestras marcas".`,
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
