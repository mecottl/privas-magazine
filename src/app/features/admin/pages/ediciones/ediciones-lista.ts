import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import type { EdicionRevista, EstadoPublicacion } from '../../../../core/models';

type Accion = 'publicado' | 'despublicado' | 'eliminar' | 'pdf';

@Component({
  selector: 'app-admin-ediciones-lista',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ediciones-lista.html',
})
export class EdicionesLista implements OnInit {
  private readonly srv = inject(EdicionesService);
  private readonly confirmar = inject(ConfirmService);

  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.ediciones.set(await this.srv.listarAdmin());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  async ejecutar(ed: EdicionRevista, valor: string) {
    const accion = valor as Accion | '';
    if (!accion) return;
    if (accion === 'pdf') {
      window.open(ed.pdf_url, '_blank', 'noopener');
      return;
    }
    this.error.set('');
    try {
      if (accion === 'eliminar') {
        const ok = await this.confirmar.confirm({
          titulo: '¿Eliminar la edición?',
          mensaje: `«${ed.titulo}» se borrará de forma permanente.`,
          cta: 'Eliminar',
          peligro: true,
        });
        if (!ok) return;
        await this.srv.eliminar(ed.id);
      } else {
        await this.srv.cambiarEstado(ed.id, accion as EstadoPublicacion);
      }
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
