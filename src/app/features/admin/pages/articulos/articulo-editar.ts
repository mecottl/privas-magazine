import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { AdminsService } from '../../../../core/services/admins.service';
import { UploadsService } from '../../../../core/services/uploads.service';
import { slugify } from '../../../../core/services/slug';
import {
  ESTADOS,
  type Articulo,
  type BloqueContenido,
  type Categoria,
  type EstadoPublicacion,
  type PerfilAdmin,
} from '../../../../core/models';

@Component({
  selector: 'app-admin-articulo-editar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page">
      <p><a routerLink="..">← Artículos</a></p>
      <h1>{{ id ? 'Editar artículo' : 'Nuevo artículo' }}</h1>

      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (ok()) { <p class="ok">{{ ok() }}</p> }

      <form (ngSubmit)="guardar()">
        <label>Título
          <input name="titulo" [(ngModel)]="m.titulo" (ngModelChange)="tituloCambio($event)" required />
        </label>
        <label>Slug
          <input name="slug" [(ngModel)]="m.slug" required />
        </label>

        <label>Autor — tipo
          <select name="autor_tipo" [(ngModel)]="m.autor_tipo">
            <option value="libre">libre</option>
            <option value="usuario">usuario</option>
          </select>
        </label>
        @if (m.autor_tipo === 'libre') {
          <label>Autor (texto)
            <input name="autor_texto" [(ngModel)]="m.autor_texto" />
          </label>
        } @else {
          <label>Autor (usuario admin)
            <select name="autor_uid" [(ngModel)]="m.autor_uid">
              <option [ngValue]="null">—</option>
              @for (u of admins(); track u.id) {
                <option [ngValue]="u.id">{{ u.nombre_visible || u.id }}</option>
              }
            </select>
          </label>
        }

        <label>Categoría
          <select name="categoria_id" [(ngModel)]="m.categoria_id">
            <option [ngValue]="null">—</option>
            @for (c of categorias(); track c.id) {
              <option [ngValue]="c.id">{{ c.nombre }}</option>
            }
          </select>
        </label>

        <label>Imagen de portada
          <input type="file" accept="image/*" (change)="subirPortada($event)" />
        </label>
        @if (subiendo()) { <p>Subiendo imagen…</p> }
        @if (m.imagen_portada_url) {
          <img [src]="m.imagen_portada_url" alt="portada" style="max-height:120px" />
        }

        <label>Contenido (JSON de bloques — MVP)
          <textarea name="contenido" rows="8" [(ngModel)]="contenidoTexto"></textarea>
        </label>
        <span class="hint">Formato: [{{ '{' }} "tipo": "texto", "contenido": "..." {{ '}' }}]</span>

        <label>Estado
          <select name="estado" [(ngModel)]="m.estado">
            @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
          </select>
        </label>
        @if (m.estado === 'programado' || m.estado === 'publicado') {
          <label>Fecha de publicación
            <input type="datetime-local" name="fecha" [(ngModel)]="fechaLocal" />
          </label>
        }

        <button type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </form>
    </section>
  `,
})
export class ArticuloEditar implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly catSrv = inject(CategoriasService);
  private readonly adminSrv = inject(AdminsService);
  private readonly uploads = inject(UploadsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id = '';
  readonly estados = ESTADOS;
  readonly categorias = signal<Categoria[]>([]);
  readonly admins = signal<PerfilAdmin[]>([]);
  readonly error = signal('');
  readonly ok = signal('');
  readonly guardando = signal(false);
  readonly subiendo = signal(false);
  private slugEditadoManualmente = false;

  m: Partial<Articulo> = {
    titulo: '',
    slug: '',
    autor_tipo: 'libre',
    autor_texto: '',
    autor_uid: null,
    categoria_id: null,
    imagen_portada_url: null,
    estado: 'borrador',
  };
  contenidoTexto = '[\n  { "tipo": "texto", "contenido": "" }\n]';
  fechaLocal = '';

  async ngOnInit() {
    this.categorias.set(await this.catSrv.listar().catch(() => []));
    this.admins.set(await this.adminSrv.listar().catch(() => []));

    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      try {
        const a = await this.srv.obtener(this.id);
        this.m = { ...a };
        this.slugEditadoManualmente = true;
        this.contenidoTexto = JSON.stringify(a.contenido_json ?? [], null, 2);
        if (a.fecha_publicacion) {
          this.fechaLocal = new Date(a.fecha_publicacion).toISOString().slice(0, 16);
        }
      } catch (e) {
        this.error.set(String(e));
      }
    }
  }

  tituloCambio(titulo: string) {
    if (!this.slugEditadoManualmente) this.m.slug = slugify(titulo);
  }

  async subirPortada(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.subiendo.set(true);
    this.error.set('');
    try {
      this.m.imagen_portada_url = await this.uploads.subir(file, 'articulo-portada');
    } catch (e) {
      this.error.set(`Subida: ${e}`);
    } finally {
      this.subiendo.set(false);
    }
  }

  async guardar() {
    this.error.set('');
    this.ok.set('');

    let contenido: BloqueContenido[];
    try {
      contenido = JSON.parse(this.contenidoTexto);
      if (!Array.isArray(contenido)) throw new Error('debe ser un array');
    } catch (e) {
      this.error.set(`Contenido JSON inválido: ${e}`);
      return;
    }

    if (this.m.autor_tipo === 'libre' && !this.m.autor_texto?.trim()) {
      this.error.set('Autor (texto) es obligatorio con tipo "libre".');
      return;
    }
    if (this.m.autor_tipo === 'usuario' && !this.m.autor_uid) {
      this.error.set('Selecciona un usuario admin como autor.');
      return;
    }

    const payload: Partial<Articulo> = {
      ...this.m,
      contenido_json: contenido,
      extracto: this.extracto(contenido),
      fecha_publicacion:
        this.m.estado === 'programado' || this.m.estado === 'publicado'
          ? this.fechaLocal
            ? new Date(this.fechaLocal).toISOString()
            : new Date().toISOString()
          : null,
    };

    this.guardando.set(true);
    try {
      if (this.id) {
        await this.srv.actualizar(this.id, payload);
        this.ok.set('Guardado.');
      } else {
        const creado = await this.srv.crear(payload);
        this.router.navigate(['/gestion-privas/articulos', creado.id]);
      }
    } catch (e) {
      this.error.set(String(e));
    } finally {
      this.guardando.set(false);
    }
  }

  /** Extracto automático: primer texto plano, truncado. */
  private extracto(bloques: BloqueContenido[]): string {
    const texto = bloques
      .map((b) => b.contenido ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return texto.slice(0, 200);
  }
}
