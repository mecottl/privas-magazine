import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { NewsletterForm } from '../newsletter/newsletter-form';
import type { Articulo, Categoria } from '../../../../core/models';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink, DatePipe, NewsletterForm],
  template: `
    <section class="page">
      <div class="inicio-encabezado">
        <h1>PRIVAS Magazine</h1>
        <p>Turismo, gastronomía, arte, cultura y entretenimiento — historias desde Yucatán.</p>
      </div>

      <nav class="filtro-categorias" aria-label="Filtrar por categoría">
        <button type="button" [class.activa]="!categoria" (click)="filtrar('')">Todas</button>
        @for (c of categorias(); track c.id) {
          <button
            type="button"
            [class.activa]="categoria === c.slug"
            (click)="filtrar(c.slug)"
          >
            {{ c.nombre }}
          </button>
        }
      </nav>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (principal(); as p) {
        <a [routerLink]="['/articulos', p.slug]" class="nota-principal">
          @if (p.imagen_portada_url) { <img [src]="p.imagen_portada_url" [alt]="p.titulo" /> }
          <div>
            <span class="meta">
              <span class="categoria-tag">
                {{ p.categorias?.nombre || 'Sin categoría' }}
              </span>
              · {{ p.fecha_publicacion | date: 'longDate' }}
            </span>
            <h2 class="titulo">{{ p.titulo }}</h2>
            <p class="extracto">{{ p.extracto }}</p>
            <span class="leer">Leer la nota</span>
          </div>
        </a>
      }

      <ul class="indice">
        @for (a of resto(); track a.id) {
          <li>
            <a [routerLink]="['/articulos', a.slug]">
              <span class="meta">
                <span class="categoria-tag">
                  {{ a.categorias?.nombre || 'Sin categoría' }}
                </span>
                · {{ a.fecha_publicacion | date: 'longDate' }}
              </span>
              <div class="fila">
                <h2>{{ a.titulo }}</h2>
              </div>
              <p class="extracto">{{ a.extracto }}</p>
            </a>
          </li>
        }
      </ul>

      @if (!principal() && resto().length === 0 && !error()) {
        <p class="indice-vacio">No hay artículos publicados todavía.</p>
      }

      <app-newsletter-form />
    </section>
  `,
})
export class Inicio implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly catSrv = inject(CategoriasService);
  readonly articulos = signal<Articulo[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly error = signal('');
  categoria = '';

  readonly principal = computed(() => this.articulos()[0]);
  readonly resto = computed(() => this.articulos().slice(1));

  async ngOnInit() {
    this.categorias.set(await this.catSrv.listar().catch(() => []));
    await this.cargar();
  }

  async filtrar(slug: string) {
    this.categoria = slug;
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
