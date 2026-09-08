import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { UploadsService } from '../../../../core/services/uploads.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import { CampoArchivo } from '../../shared/campo-archivo/campo-archivo';
import {
  ESTADOS,
  TEMPORADAS,
  type EdicionRevista,
  type EstadoPublicacion,
} from '../../../../core/models';

type Modo = 'publicar' | 'programar' | 'despublicar';

@Component({
  selector: 'app-admin-edicion-editar',
  standalone: true,
  imports: [FormsModule, RouterLink, CampoArchivo],
  templateUrl: './edicion-editar.html',
  styleUrl: './edicion-editar.scss',
})
export class EdicionEditar implements OnInit {
  private readonly srv = inject(EdicionesService);
  private readonly uploads = inject(UploadsService);
  private readonly confirmar = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  id = '';
  readonly estados = ESTADOS;
  readonly temporadas = TEMPORADAS;
  readonly error = signal('');
  readonly ok = signal('');
  readonly guardando = signal(false);
  readonly subiendoPdf = signal(false);
  readonly subiendoPortada = signal(false);
  readonly modo = signal<Modo | null>(null);
  readonly errorModal = signal('');

  m: Partial<EdicionRevista> = {
    titulo: '',
    temporada: 'otono-invierno',
    anio: new Date().getFullYear(),
    pdf_url: '',
    portada_url: '',
    estado: 'borrador',
  };
  fechaProgramada = '';
  readonly minProgramable = new Date(Date.now() + 5 * 60_000)
    .toISOString()
    .slice(0, 16);

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) return;
    try {
      const ed = await this.srv.obtener(this.id);
      this.m = { ...ed };
      if (ed.fecha_publicacion && ed.estado === 'programado') {
        this.fechaProgramada = new Date(ed.fecha_publicacion)
          .toISOString()
          .slice(0, 16);
      }
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cdr.markForCheck();
    }
  }

  async subirPdf(file: File) {
    await this.subir(file, 'revista-pdf', this.subiendoPdf);
  }
  async subirPortada(file: File) {
    await this.subir(file, 'revista-portada', this.subiendoPortada);
  }
  private async subir(
    file: File,
    tipo: 'revista-pdf' | 'revista-portada',
    flag: ReturnType<typeof signal<boolean>>,
  ) {
    flag.set(true);
    this.error.set('');
    try {
      const s = await this.uploads.subir(file, tipo);
      if (tipo === 'revista-pdf') {
        this.m.pdf_url = s.url;
        this.m.pdf_path = s.path;
        this.m.pdf_target = s.target;
      } else {
        this.m.portada_url = s.url;
        this.m.portada_path = s.path;
        this.m.portada_target = s.target;
      }
    } catch (e) {
      this.error.set(`Subida: ${mensajeError(e)}`);
    } finally {
      flag.set(false);
    }
  }

  async guardarBorrador() {
    if (!this.validar()) return;
    await this.persistir(this.m.estado as EstadoPublicacion, this.m.fecha_publicacion ?? null, {
      irATabla: false,
    });
  }

  async eliminar() {
    if (!this.id) return;
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar la edición?',
      mensaje: `«${this.m.titulo}» se borrará de forma permanente.`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.srv.eliminar(this.id);
      this.router.navigate(['/gestion-privas/ediciones']);
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

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
    if (!this.m.pdf_url || !this.m.portada_url) {
      this.error.set('Sube el PDF y la portada antes de guardar.');
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
    const payload: Partial<EdicionRevista> = {
      titulo: this.m.titulo?.trim(),
      temporada: this.m.temporada,
      anio: Number(this.m.anio),
      pdf_url: this.m.pdf_url,
      pdf_path: this.m.pdf_path ?? null,
      pdf_target: this.m.pdf_target ?? null,
      portada_url: this.m.portada_url,
      portada_path: this.m.portada_path ?? null,
      portada_target: this.m.portada_target ?? null,
      estado,
      fecha_publicacion,
    };
    this.guardando.set(true);
    try {
      if (this.id) {
        await this.srv.actualizar(this.id, payload);
      } else {
        const creada = await this.srv.crear(payload);
        this.id = creada.id;
      }
      this.m.estado = estado;
      this.m.fecha_publicacion = fecha_publicacion;

      if (opts.irATabla) {
        this.router.navigate(['/gestion-privas/ediciones']);
      } else if (!this.route.snapshot.paramMap.get('id')) {
        this.router.navigate(['/gestion-privas/ediciones', this.id]);
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
      publicar: '¿Publicar esta edición?',
      programar: 'Programar publicación',
      despublicar: '¿Despublicar la edición?',
    }[md];
  }
  textoModal(md: Modo): string {
    return {
      publicar: `«${this.m.titulo}» se hará visible en /revistas de inmediato.`,
      programar: `«${this.m.titulo}» se publicará solo en la fecha que elijas.`,
      despublicar: `«${this.m.titulo}» dejará de verse en el sitio. El PDF se conserva.`,
    }[md];
  }
  ctaModal(md: Modo): string {
    return { publicar: 'Publicar ahora', programar: 'Programar', despublicar: 'Despublicar' }[md];
  }
}
