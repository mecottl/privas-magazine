import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { ESTADOS, type Articulo, type EstadoPublicacion } from '../../../../core/models';

@Component({
  selector: 'app-admin-articulos-lista',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="admin-page-head">
      <div>
        <h1>Artículos</h1>
        <p>{{ articulos().length }} en la vista actual</p>
      </div>
      <div class="admin-page-head__acciones">
        <a routerLink="nuevo"><button>Nuevo artículo</button></a>
      </div>
    </div>

    <div class="row">
      <label>
        Estado
        <select [(ngModel)]="filtro" (ngModelChange)="cargar()">
          <option value="">Todos</option>
          @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
        </select>
      </label>
    </div>

    @if (error()) { <p class="error">{{ error() }}</p> }

    <div class="tabla-wrap">
      <table>
        <thead>
          <tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Fecha pub.</th><th></th></tr>
        </thead>
        <tbody>
          @for (a of articulos(); track a.id) {
            <tr>
              <td><a [routerLink]="[a.id]">{{ a.titulo }}</a></td>
              <td>{{ a.categorias?.nombre || '—' }}</td>
              <td><span class="badge badge--{{ a.estado }}">{{ a.estado }}</span></td>
              <td>{{ a.fecha_publicacion ? (a.fecha_publicacion | date: 'dd MMM y') : '—' }}</td>
              <td class="acciones">
                <a [routerLink]="[a.id]"><button class="secundario">Editar</button></a>
                @if (a.estado !== 'publicado') {
                  <button class="secundario" (click)="estado(a, 'publicado')">Publicar</button>
                }
                @if (a.estado === 'publicado') {
                  <button class="secundario" (click)="estado(a, 'despublicado')">Despublicar</button>
                }
                @if (a.estado !== 'borrador') {
                  <button class="secundario" (click)="estado(a, 'borrador')">A borrador</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5"><div class="admin-empty">Sin artículos en este filtro.</div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ArticulosLista implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly route = inject(ActivatedRoute);
  readonly articulos = signal<Articulo[]>([]);
  readonly error = signal('');
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
    try {
      this.articulos.set(await this.srv.listarAdmin(this.filtro));
    } catch (e) {
      this.error.set(String(e));
    }
  }

  async estado(a: Articulo, e: EstadoPublicacion) {
    try {
      await this.srv.cambiarEstado(a.id, e);
      await this.cargar();
    } catch (err) {
      this.error.set(String(err));
    }
  }
}
