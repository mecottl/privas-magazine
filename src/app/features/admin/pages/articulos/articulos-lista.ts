import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasNombrePipe } from '../../../../shared/pipes/categorias-nombre.pipe';
import { ConfirmService } from '../../../../shared/components/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import { ESTADOS, type Articulo, type EstadoPublicacion } from '../../../../core/models';

type Accion = 'publicado' | 'despublicado' | 'borrador' | 'eliminar';

@Component({
  selector: 'app-admin-articulos-lista',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CategoriasNombrePipe],
  template: `
    <div class="admin-page">
      <div class="admin-page-head">
        <h1>Artículos</h1>
        <div class="admin-page-head__acciones">
          <a routerLink="nuevo"><button>Nuevo artículo</button></a>
        </div>
      </div>

      <div class="admin-page__fill">
        <div class="row" style="margin:0">
          <label style="margin:0">
            <select [(ngModel)]="filtro" (ngModelChange)="cargar()" aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
            </select>
          </label>
        </div>

        @if (error()) { <p class="error">{{ error() }}</p> }

        <div class="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th><th>Categoría</th><th>Estado</th><th>Fecha pub.</th>
                <th class="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                <tr><td colspan="5"><div class="admin-cargando">Cargando…</div></td></tr>
              } @else {
                @for (a of articulos(); track a.id) {
                  <tr>
                    <td><a [routerLink]="[a.id]">{{ a.titulo }}</a></td>
                    <td>{{ a.categorias | categoriasNombre: '—' }}</td>
                    <td><span class="badge badge--{{ a.estado }}">{{ a.estado }}</span></td>
                    <td>{{ a.fecha_publicacion ? (a.fecha_publicacion | date: 'dd MMM y') : '—' }}</td>
                    <td class="col-acciones">
                      <div class="acciones">
                        <a [routerLink]="[a.id]"><button class="secundario">Editar</button></a>
                        <select #sel aria-label="Más acciones" (change)="ejecutar(a, sel.value); sel.value = ''">
                          <option value="" selected>Acciones…</option>
                          @if (a.estado !== 'publicado') { <option value="publicado">Publicar</option> }
                          @if (a.estado === 'publicado') { <option value="despublicado">Despublicar</option> }
                          @if (a.estado !== 'borrador') { <option value="borrador">Pasar a borrador</option> }
                          <option value="eliminar">Eliminar</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5"><div class="admin-empty">Sin artículos.</div></td></tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
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
