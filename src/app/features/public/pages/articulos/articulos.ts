import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import type { Articulo, Categoria } from '../../../../core/models';

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <section class="page">
      <h1>Artículos</h1>
      <label>
        Categoría:
        <select [(ngModel)]="categoria" (ngModelChange)="cargar()">
          <option value="">todas</option>
          @for (c of categorias(); track c.id) {
            <option [value]="c.slug">{{ c.nombre }}</option>
          }
        </select>
      </label>
      @if (error()) { <p class="error">{{ error() }}</p> }
      <ul class="articulos">
        @for (a of articulos(); track a.id) {
          <li>
            @if (a.imagen_portada_url) { <img [src]="a.imagen_portada_url" [alt]="a.titulo" /> }
            <div>
              <span class="meta">
                {{ a.categorias?.nombre || 'Sin categoría' }}
                · {{ a.fecha_publicacion | date: 'longDate' }}
              </span>
              <a [routerLink]="['/articulos', a.slug]"><h2>{{ a.titulo }}</h2></a>
              <p>{{ a.extracto }}</p>
            </div>
          </li>
        } @empty {
          <li>No hay artículos publicados todavía.</li>
        }
      </ul>
    </section>
  `,
})
export class Articulos implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly catSrv = inject(CategoriasService);
  readonly articulos = signal<Articulo[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly error = signal('');
  categoria = '';

  async ngOnInit() {
    this.categorias.set(await this.catSrv.listar().catch(() => []));
    await this.cargar();
  }

  async cargar() {
    this.error.set('');
    try {
      this.articulos.set(await this.srv.listarPublicos(this.categoria || undefined));
    } catch (e) {
      this.error.set(String(e));
    }
  }
}
