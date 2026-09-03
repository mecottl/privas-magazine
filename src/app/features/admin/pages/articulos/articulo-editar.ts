import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { AdminsService } from '../../../../core/services/admins.service';
import { UploadsService } from '../../../../core/services/uploads.service';
import { slugify } from '../../../../core/services/slug';
import { EditorContenido } from '../../editor-contenido/editor-contenido';
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
  imports: [FormsModule, RouterLink, EditorContenido],
  template: `
    <div class="admin-page-head">
      <div>
        <p style="margin:0 0 .35rem"><a routerLink="..">← Volver a artículos</a></p>
        <h1>{{ id ? 'Editar artículo' : 'Nuevo artículo' }}</h1>
      </div>
    </div>

    @if (error()) { <p class="error">{{ error() }}</p> }
    @if (ok()) { <p class="ok">{{ ok() }}</p> }

    <form (ngSubmit)="guardar()">
      <div class="editor-grid">
        <fieldset class="panel">
          <legend>Contenido</legend>
          <label>Título
            <input name="titulo" [(ngModel)]="m.titulo" (ngModelChange)="tituloCambio($event)" required />
          </label>
          <p class="hint">
            URL pública: <code>/articulos/{{ m.slug || 'se-genera-del-titulo' }}</code>
            — se genera automáticamente del título.
          </p>

          <label class="editor-label">Cuerpo del artículo</label>
          <app-editor-contenido [(contenido)]="contenidoBloques" />
          <span class="hint">El extracto se genera solo a partir de los encabezados y párrafos.</span>
        </fieldset>

        <div class="editor-lado">
          <fieldset class="panel">
            <legend>Publicación</legend>
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
            <label>Categoría
              <select name="categoria_id" [(ngModel)]="m.categoria_id">
                <option [ngValue]="null">Sin categoría</option>
                @for (c of categorias(); track c.id) {
                  <option [ngValue]="c.id">{{ c.nombre }}</option>
                }
              </select>
            </label>
          </fieldset>

          <fieldset class="panel">
            <legend>Autoría</legend>
            <label>Tipo de autor
              <select name="autor_tipo" [(ngModel)]="m.autor_tipo">
                <option value="libre">Texto libre</option>
                <option value="usuario">Usuario admin</option>
              </select>
            </label>
            @if (m.autor_tipo === 'libre') {
              <label>Autor
                <input name="autor_texto" [(ngModel)]="m.autor_texto" />
              </label>
            } @else {
              <label>Autor
                <select name="autor_uid" [(ngModel)]="m.autor_uid">
                  <option [ngValue]="null">—</option>
                  @for (u of admins(); track u.id) {
                    <option [ngValue]="u.id">{{ u.nombre_visible || u.id }}</option>
                  }
                </select>
              </label>
            }
          </fieldset>

          <fieldset class="panel">
            <legend>Portada</legend>
            <label>Imagen
              <input type="file" accept="image/*" (change)="subirPortada($event)" />
            </label>
            @if (subiendo()) { <p class="hint">Subiendo imagen…</p> }
            @if (m.imagen_portada_url) {
              <img [src]="m.imagen_portada_url" alt="Portada del artículo" class="portada-preview" />
            }
          </fieldset>
        </div>
      </div>

      <div class="editor-barra">
        <button type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Guardar artículo' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .editor-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
      gap: var(--space-lg);
      align-items: start;
    }
    .editor-lado {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }
    .editor-label {
      margin-bottom: 0.4rem;
    }
    .portada-preview {
      margin-top: 0.5rem;
      max-height: 160px;
      border: 1px solid var(--color-linea);
      border-radius: var(--radius);
    }
    .editor-barra {
      position: sticky;
      bottom: 0;
      margin-top: var(--space-lg);
      padding: var(--space-md) 0;
      background: var(--color-fondo-alt);
      border-top: 1px solid var(--color-linea);
    }
    @media (max-width: 860px) {
      .editor-grid { grid-template-columns: 1fr; }
    }
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
  contenidoBloques: BloqueContenido[] = [];
  fechaLocal = '';

  async ngOnInit() {
    this.categorias.set(await this.catSrv.listar().catch(() => []));
    this.admins.set(await this.adminSrv.listar().catch(() => []));

    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      try {
        const a = await this.srv.obtener(this.id);
        this.m = { ...a };
        this.contenidoBloques = Array.isArray(a.contenido_json)
          ? (a.contenido_json as BloqueContenido[])
          : [];
        if (a.fecha_publicacion) {
          this.fechaLocal = new Date(a.fecha_publicacion).toISOString().slice(0, 16);
        }
      } catch (e) {
        this.error.set(String(e));
      }
    }
  }

  /** El slug SIEMPRE se deriva del título (no editable). */
  tituloCambio(titulo: string) {
    this.m.slug = slugify(titulo ?? '');
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

    const contenido = this.contenidoBloques ?? [];
    this.m.slug = slugify(this.m.titulo ?? '');

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

  /**
   * Extracto automático: concatena el texto de los bloques `header` y
   * `paragraph` (los demás — imagen, cita, lista — se ignoran), quita el
   * HTML inline de Editor.js y trunca a 200 caracteres.
   */
  private extracto(bloques: BloqueContenido[]): string {
    const texto = bloques
      .filter((b) => b.type === 'header' || b.type === 'paragraph')
      .map((b) => String((b.data as { text?: string })?.text ?? ''))
      .join(' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    return texto.slice(0, 200);
  }
}
