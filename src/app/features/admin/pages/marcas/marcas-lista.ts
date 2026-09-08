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
  styleUrl: './marcas-lista.scss',
})
export class MarcasLista implements OnInit {
  private readonly srv = inject(MarcasService);
  private readonly confirmar = inject(ConfirmService);

  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);
  readonly guardandoOrden = signal(false);
  /** Índice de la fila que se está arrastrando. */
  readonly arrastrado = signal<number | null>(null);

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

  // --- Reordenar por arrastre ---
  alArrastrar(i: number) {
    this.arrastrado.set(i);
  }
  alSoltarEn(i: number) {
    const desde = this.arrastrado();
    this.arrastrado.set(null);
    if (desde === null || desde === i) return;
    const arr = [...this.marcas()];
    const [m] = arr.splice(desde, 1);
    arr.splice(i, 0, m);
    this.marcas.set(arr);
    void this.persistirOrden(arr);
  }
  alFinArrastre() {
    this.arrastrado.set(null);
  }

  private async persistirOrden(arr: Marca[]) {
    this.guardandoOrden.set(true);
    this.error.set('');
    try {
      await this.srv.reordenar(arr.map((m) => m.id));
    } catch (e) {
      this.error.set(mensajeError(e));
      await this.cargar();
    } finally {
      this.guardandoOrden.set(false);
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
