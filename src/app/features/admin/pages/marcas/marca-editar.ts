import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MarcasService } from '../../../../core/services/marcas.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import {
  TIPOS_ENLACE,
  type EnlaceMarca,
  type Marca,
} from '../../../../core/models';

@Component({
  selector: 'app-admin-marca-editar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './marca-editar.html',
  styleUrl: './marca-editar.scss',
})
export class MarcaEditar implements OnInit {
  private readonly srv = inject(MarcasService);
  private readonly confirmar = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  id = '';
  readonly tipos = TIPOS_ENLACE;
  readonly error = signal('');
  readonly ok = signal('');
  readonly guardando = signal(false);

  m: Partial<Marca> = {
    nombre: '',
    descripcion: '',
    sitio_web_url: '',
    logo_url: '',
    orden: 0,
    enlaces: [],
  };

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) return;
    try {
      const marca = await this.srv.obtener(this.id);
      this.m = { ...marca, enlaces: [...(marca.enlaces ?? [])] };
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cdr.markForCheck();
    }
  }

  agregarEnlace() {
    (this.m.enlaces ??= []).push({ tipo: 'instagram', url: '' });
  }
  quitarEnlace(i: number) {
    this.m.enlaces?.splice(i, 1);
  }

  async guardar() {
    this.error.set('');
    this.ok.set('');
    if (!this.m.nombre?.trim()) {
      this.error.set('El nombre es obligatorio.');
      return;
    }
    const payload: Partial<Marca> = {
      nombre: this.m.nombre,
      descripcion: this.m.descripcion,
      sitio_web_url: this.m.sitio_web_url,
      logo_url: this.m.logo_url,
      orden: Number(this.m.orden) || 0,
      enlaces: this.m.enlaces as EnlaceMarca[],
    };
    this.guardando.set(true);
    try {
      if (this.id) {
        await this.srv.actualizar(this.id, payload);
        this.ok.set('Cambios guardados.');
      } else {
        const creada = await this.srv.crear(payload);
        this.id = creada.id;
        this.router.navigate(['/gestion-privas/marcas', this.id]);
      }
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar() {
    if (!this.id) return;
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar la marca?',
      mensaje: `«${this.m.nombre}» dejará de aparecer en "Nuestras marcas".`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.guardando.set(true);
    try {
      await this.srv.eliminar(this.id);
      this.router.navigate(['/gestion-privas/marcas']);
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }
}
