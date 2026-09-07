import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasNombrePipe } from '../../../../shared/pipes/categorias-nombre.pipe';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import { ESTADOS, type Articulo, type EstadoPublicacion } from '../../../../core/models';

type Accion = 'publicado' | 'despublicado' | 'borrador' | 'eliminar';

@Component({
  selector: 'app-admin-articulos-lista',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CategoriasNombrePipe],
  templateUrl: './articulos-lista.html',
})
export class ArticulosLista implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmar = inject(ConfirmService);
  readonly articulos = signal<Articulo[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);
  readonly estados = ESTADOS;
  filtro: EstadoPublicacion | '' = '';

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap.get('estado');
    if (q && (ESTADOS as string[]).includes(q)) {
      this.filtro = q as EstadoPublicacion;
    }
    this.cargar();
  }

  async cargar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      this.articulos.set(await this.srv.listarAdmin(this.filtro));
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  async ejecutar(a: Articulo, valor: string) {
    const accion = valor as Accion | '';
    if (!accion) return;
    this.error.set('');
    try {
      if (accion === 'eliminar') {
        const ok = await this.confirmar.confirm({
          titulo: '¿Eliminar el artículo?',
          mensaje: `«${a.titulo}» se borrará de forma permanente.`,
          cta: 'Eliminar',
          peligro: true,
        });
        if (!ok) return;
        await this.srv.eliminar(a.id);
      } else {
        await this.srv.cambiarEstado(a.id, accion as EstadoPublicacion);
      }
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
