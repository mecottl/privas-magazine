import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { ESTADOS, type Articulo, type EstadoPublicacion } from '../../../../core/models';

@Component({
  selector: 'app-admin-articulos-lista',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <section class="page">
      <h1>Artículos</h1>
      <div class="row">
        <a routerLink="nuevo"><button>Nuevo artículo</button></a>
        <label>
          Estado:
          <select [(ngModel)]="filtro" (ngModelChange)="cargar()">
            <option value="">todos</option>
            @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
          </select>
        </label>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      <table>
        <thead>
          <tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Fecha pub.</th><th></th></tr>
        </thead>
        <tbody>
          @for (a of articulos(); track a.id) {
            <tr>
              <td>{{ a.titulo }}</td>
              <td>{{ a.categorias?.nombre || '—' }}</td>
              <td>{{ a.estado }}</td>
              <td>{{ a.fecha_publicacion ? (a.fecha_publicacion | date: 'short') : '—' }}</td>
              <td class="acciones">
                <a [routerLink]="[a.id]"><button>Editar</button></a>
                @if (a.estado !== 'publicado') {
                  <button (click)="estado(a, 'publicado')">Publicar</button>
                }
                @if (a.estado === 'publicado') {
                  <button (click)="estado(a, 'despublicado')">Despublicar</button>
                }
                @if (a.estado !== 'borrador') {
                  <button (click)="estado(a, 'borrador')">A borrador</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">Sin artículos.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class ArticulosLista implements OnInit {
  private readonly srv = inject(ArticulosService);
  readonly articulos = signal<Articulo[]>([]);
  readonly error = signal('');
  readonly estados = ESTADOS;
  filtro: EstadoPublicacion | '' = '';

  ngOnInit() {
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
