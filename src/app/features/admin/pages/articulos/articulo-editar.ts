import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { UploadsService } from '../../../../core/services/uploads.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog';
import { slugify } from '../../../../core/services/slug';
import { mensajeError } from '../../../../core/services/errores';
import { EditorContenido } from '../../editor-contenido/editor-contenido';
import {
  type Articulo,
  type BloqueContenido,
  type Categoria,
  type EstadoPublicacion,
} from '../../../../core/models';

type Modo = 'publicar' | 'programar' | 'despublicar';

@Component({
  selector: 'app-admin-articulo-editar',
  standalone: true,
  imports: [FormsModule, RouterLink, EditorContenido],
  template: `
    <div class="admin-page">
      <div class="admin-page-head">
        <div>
          <a routerLink=".." class="volver">← Artículos</a>
          <h1>{{ id ? 'Editar artículo' : 'Nuevo artículo' }}</h1>
        </div>
      </div>

      <div class="editor-body">
        @if (error()) { <p class="error">{{ error() }}</p> }
        @if (ok()) { <p class="ok">{{ ok() }}</p> }

        <form (submit)="$event.preventDefault()" class="editor-grid">
          <section class="editor-doc">
            <input
              class="editor-titulo"
              name="titulo"
              placeholder="Título del artículo"
              [(ngModel)]="m.titulo"
              (ngModelChange)="tituloCambio($event)"
              required
            />
            <div class="editor-holder-wrap">
              <app-editor-contenido [(contenido)]="contenidoBloques" />
            </div>
          </section>

          <aside class="editor-lado">
            <div class="lado-panel">
              <p class="lado-titulo">Publicación</p>
              <p class="editor-estado">
                <span class="badge badge--{{ m.estado }}">{{ m.estado }}</span>
              </p>
              <div class="editor-acciones">
                @if (m.estado === 'publicado') {
                  <button type="button" (click)="guardarSinCambiarEstado()" [disabled]="guardando()">
                    {{ guardando() ? 'Guardando…' : 'Guardar cambios' }}
                  </button>
                  <button type="button" class="secundario peligro" (click)="abrir('despublicar')">
                    Despublicar
                  </button>
                } @else {
                  <button type="button" (click)="abrir('publicar')">Publicar ahora</button>
                  <button type="button" class="secundario" (click)="abrir('programar')">Programar…</button>
                  <button type="button" class="secundario" (click)="guardarSinCambiarEstado()" [disabled]="guardando()">
                    {{ guardando() ? 'Guardando…' : 'Guardar borrador' }}
                  </button>
                }
                @if (id) {
                  <button type="button" class="secundario peligro" (click)="eliminar()">Eliminar</button>
                }
              </div>
            </div>

            <div class="lado-panel">
              <p class="lado-titulo">Autor</p>
              <input name="autor" aria-label="Autor" [(ngModel)]="m.autor_texto" placeholder="Nombre del autor" />
            </div>

            <div class="lado-panel">
              <p class="lado-titulo">Categorías</p>
              @if (categorias().length) {
                <div class="check-list">
                  @for (c of categorias(); track c.id) {
                    <label class="check">
                      <input
                        type="checkbox"
                        [checked]="categoriaIds().has(c.id)"
                        (change)="toggleCategoria(c.id)"
                      />
                      {{ c.nombre }}
                    </label>
                  }
                </div>
              } @else {
                <p class="hint"><a routerLink="../../categorias">Crear categorías</a></p>
              }
            </div>

            <div class="lado-panel">
              <p class="lado-titulo">Portada</p>
              <input type="file" accept="image/*" aria-label="Imagen de portada" (change)="subirPortada($event)" />
              @if (subiendo()) { <p class="hint">Subiendo…</p> }
              @if (m.imagen_portada_url) {
                <img [src]="m.imagen_portada_url" alt="Portada del artículo" class="portada-preview" />
              }
            </div>
          </aside>
        </form>
      </div>
    </div>

    <dialog #dlg class="confirm" (close)="alCerrarModal()">
      @if (modo(); as md) {
        <h2>{{ tituloModal(md) }}</h2>
        <p>{{ textoModal(md) }}</p>
        @if (md === 'programar') {
          <label>Fecha y hora de publicación
            <input type="datetime-local" [(ngModel)]="fechaProgramada" [min]="minProgramable" />
          </label>
        }
        @if (errorModal()) { <p class="error">{{ errorModal() }}</p> }
        <div class="confirm__acciones">
          <button type="button" class="secundario" (click)="cerrarModal()">Cancelar</button>
          <button type="button" (click)="confirmarAccion()" [disabled]="guardando()">
            {{ guardando() ? 'Guardando…' : ctaModal(md) }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: `
    /* Todo el editor cabe en una pantalla; solo el cuerpo del artículo scrollea */
    .editor-body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding-top: var(--space-sm);
    }
    .editor-body > .error,
    .editor-body > .ok { flex: none; margin: 0 0 0.6rem; }

    .editor-grid {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      grid-template-rows: minmax(0, 1fr);
      gap: var(--space-md);
      overflow: hidden;
    }

    /* --- Documento (izquierda) --- */
    .editor-doc {
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--line-2);
      border-radius: var(--radio);
      background: var(--white);
      overflow: hidden;
    }
    .editor-titulo {
      flex: none;
      width: 100%;
      margin: 0;
      border: none;
      border-bottom: 1px solid var(--line-2);
      border-radius: 0;
      background: var(--white);
      padding: 0.9rem 1.1rem;
      font-family: var(--serif);
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--ink);
    }
    .editor-titulo:focus { outline: none; box-shadow: none; border-color: var(--line-2); border-bottom-color: var(--teal); }
    .editor-holder-wrap {
      flex: 1;
      min-height: 0;
      position: relative;
    }
    .editor-holder-wrap app-editor-contenido {
      position: absolute;
      inset: 0;
    }

    /* --- Panel lateral (derecha): compacto, sin scroll salvo pantallas muy bajas --- */
    .editor-lado {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      margin: 0;
      min-height: 0;
      overflow-y: auto;
    }
    .lado-panel {
      flex: none;
      background: var(--white);
      border: 1px solid var(--line-2);
      border-radius: var(--radio);
      padding: 0.8rem 0.9rem;
    }
    .lado-titulo {
      margin: 0 0 0.55rem;
      font-family: var(--sans);
      font-size: var(--fs-3xs);
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--ink-55);
    }
    .lado-panel input {
      margin: 0;
      width: 100%;
    }
    .editor-estado { margin: 0 0 0.6rem; }
    .editor-acciones {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .editor-acciones button {
      width: 100%;
      justify-content: center;
      height: 2.2rem;
      padding-block: 0;
    }
    .portada-preview {
      margin-top: 0.5rem;
      max-height: 120px;
      border: 1px solid var(--line);
      border-radius: var(--radio);
    }
    .check-list { display: flex; flex-direction: column; gap: 0.35rem; }
    .check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-weight: 400;
      font-size: var(--fs-sm);
      color: var(--ink-80);
      cursor: pointer;
    }
    .check input { width: auto; margin: 0; }

    @media (max-width: 900px) {
      .editor-body { overflow-y: auto; }
      .editor-grid { display: block; min-height: 0; }
      .editor-doc { height: 60vh; margin-bottom: var(--space-md); }
      .editor-lado { overflow: visible; min-height: 0; }
    }
  `,
})
export class ArticuloEditar implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly catSrv = inject(CategoriasService);
  private readonly uploads = inject(UploadsService);
  private readonly auth = inject(AuthService);
  private readonly confirmar = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  id = '';
  readonly categorias = signal<Categoria[]>([]);
  readonly categoriaIds = signal<Set<string>>(new Set());
  readonly error = signal('');
  readonly ok = signal('');
  readonly guardando = signal(false);
  readonly subiendo = signal(false);
  readonly modo = signal<Modo | null>(null);
  readonly errorModal = signal('');

  m: Partial<Articulo> = {
    titulo: '',
    slug: '',
    autor_tipo: 'libre',
    autor_texto: '',
    autor_uid: null,
    imagen_portada_url: null,
    imagen_portada_path: null,
    imagen_portada_target: null,
    estado: 'borrador',
  };
  contenidoBloques: BloqueContenido[] = [];
  fechaProgramada = '';
  readonly minProgramable = new Date(Date.now() + 5 * 60_000)
    .toISOString()
    .slice(0, 16);

  async ngOnInit() {
    this.categorias.set(await this.catSrv.listar().catch(() => []));
    this.id = this.route.snapshot.paramMap.get('id') ?? '';

    if (this.id) {
      try {
        const a = await this.srv.obtener(this.id);
        this.m = { ...a };
        this.m.autor_texto =
          a.autor_texto || this.nombreCuenta();
        this.contenidoBloques = Array.isArray(a.contenido_json)
          ? (a.contenido_json as BloqueContenido[])
          : [];
        this.categoriaIds.set(new Set((a.categorias ?? []).map((c) => c.id)));
        if (a.fecha_publicacion && a.estado === 'programado') {
          this.fechaProgramada = new Date(a.fecha_publicacion)
            .toISOString()
            .slice(0, 16);
        }
      } catch (e) {
        this.error.set(mensajeError(e));
      }
    } else {
      this.m.autor_texto = this.nombreCuenta();
    }
  }

  private nombreCuenta(): string {
    return (
      this.auth.perfil()?.nombre_visible || this.auth.user()?.email || ''
    );
  }

  tituloCambio(titulo: string) {
    this.m.slug = slugify(titulo ?? '');
  }

  toggleCategoria(id: string) {
    const s = new Set(this.categoriaIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.categoriaIds.set(s);
  }

  async subirPortada(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.subiendo.set(true);
    this.error.set('');
    try {
      const subida = await this.uploads.subir(file, 'articulo-portada');
      this.m.imagen_portada_url = subida.url;
      this.m.imagen_portada_path = subida.path;
      this.m.imagen_portada_target = subida.target;
    } catch (e) {
      this.error.set(`Subida: ${mensajeError(e)}`);
    } finally {
      this.subiendo.set(false);
    }
  }

  // --- Guardar sin cambiar el estado (borrador / cambios) ---
  async guardarSinCambiarEstado() {
    if (!this.validar()) return;
    await this.persistir(
      this.m.estado as EstadoPublicacion,
      this.m.fecha_publicacion ?? null,
      { irATabla: false },
    );
  }

  async eliminar() {
    if (!this.id) return;
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar el artículo?',
      mensaje: `«${this.m.titulo}» se borrará de forma permanente.`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.srv.eliminar(this.id);
      this.router.navigate(['/gestion-privas/articulos']);
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  // --- Acciones de estado con confirmación ---
  abrir(md: Modo) {
    if (!this.validar()) return;
    this.errorModal.set('');
    if (md === 'programar' && !this.fechaProgramada) {
      this.fechaProgramada = this.minProgramable;
    }
    this.modo.set(md);
    this.dlg().nativeElement.showModal();
  }

  cerrarModal() {
    this.dlg().nativeElement.close();
  }
  alCerrarModal() {
    this.modo.set(null);
    this.errorModal.set('');
  }

  async confirmarAccion() {
    const md = this.modo();
    if (!md) return;

    let estado: EstadoPublicacion;
    let fecha: string | null;

    if (md === 'publicar') {
      estado = 'publicado';
      fecha = new Date().toISOString();
    } else if (md === 'despublicar') {
      estado = 'despublicado';
      fecha = this.m.fecha_publicacion ?? null;
    } else {
      const t = new Date(this.fechaProgramada).getTime();
      if (!this.fechaProgramada || Number.isNaN(t) || t <= Date.now()) {
        this.errorModal.set('Elige una fecha y hora futura.');
        return;
      }
      estado = 'programado';
      fecha = new Date(this.fechaProgramada).toISOString();
    }

    const okGuardado = await this.persistir(estado, fecha, { irATabla: true });
    if (okGuardado) this.dlg().nativeElement.close();
  }

  private validar(): boolean {
    this.error.set('');
    if (!this.m.titulo?.trim()) {
      this.error.set('El título es obligatorio.');
      return false;
    }
    if (!this.m.autor_texto?.trim()) {
      this.error.set('Falta el nombre del autor.');
      return false;
    }
    return true;
  }

  private async persistir(
    estado: EstadoPublicacion,
    fecha_publicacion: string | null,
    opts: { irATabla: boolean },
  ): Promise<boolean> {
    this.error.set('');
    this.ok.set('');
    this.m.slug = slugify(this.m.titulo ?? '');
    const contenido = this.contenidoBloques ?? [];
    const cats = [...this.categoriaIds()];

    const payload: Partial<Articulo> = {
      titulo: this.m.titulo,
      slug: this.m.slug,
      contenido_json: contenido,
      extracto: this.extracto(contenido),
      imagen_portada_url: this.m.imagen_portada_url ?? null,
      imagen_portada_path: this.m.imagen_portada_path ?? null,
      imagen_portada_target: this.m.imagen_portada_target ?? null,
      autor_tipo: 'libre',
      autor_texto: this.m.autor_texto?.trim() ?? '',
      autor_uid: null,
      estado,
      fecha_publicacion,
    };

    this.guardando.set(true);
    try {
      if (this.id) {
        await this.srv.actualizar(this.id, payload, cats);
      } else {
        const creado = await this.srv.crear(payload, cats);
        this.id = creado.id;
      }
      this.m.estado = estado;
      this.m.fecha_publicacion = fecha_publicacion;

      if (opts.irATabla) {
        this.router.navigate(['/gestion-privas/articulos']);
      } else if (!this.route.snapshot.paramMap.get('id')) {
        // Primer guardado de un artículo nuevo: pasa a modo edición.
        this.router.navigate(['/gestion-privas/articulos', this.id]);
      } else {
        this.ok.set('Cambios guardados.');
      }
      return true;
    } catch (e) {
      this.error.set(mensajeError(e));
      return false;
    } finally {
      this.guardando.set(false);
    }
  }

  tituloModal(md: Modo): string {
    return {
      publicar: '¿Publicar este artículo?',
      programar: 'Programar publicación',
      despublicar: '¿Despublicar el artículo?',
    }[md];
  }
  textoModal(md: Modo): string {
    return {
      publicar:
        `«${this.m.titulo}» se hará visible en el sitio de inmediato y se disparará la recompilación.`,
      programar:
        `«${this.m.titulo}» se publicará solo en la fecha que elijas.`,
      despublicar:
        `«${this.m.titulo}» dejará de verse en el sitio. El contenido se conserva.`,
    }[md];
  }
  ctaModal(md: Modo): string {
    return { publicar: 'Publicar ahora', programar: 'Programar', despublicar: 'Despublicar' }[md];
  }

  private extracto(bloques: BloqueContenido[]): string {
    return bloques
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
      .trim()
      .slice(0, 200);
  }
}
