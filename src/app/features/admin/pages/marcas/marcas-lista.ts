import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarcasService } from '../../../../core/services/marcas.service';
import { ConfirmService } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { mensajeError } from '../../../../core/services/errores';
import { TIPOS_ENLACE, type EnlaceMarca, type Marca } from '../../../../core/models';

@Component({
  selector: 'app-admin-marcas-lista',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './marcas-lista.html',
  styleUrl: './marcas-lista.scss',
})
export class MarcasLista implements OnInit {
  private readonly srv = inject(MarcasService);
  private readonly confirmar = inject(ConfirmService);
  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly tipos = TIPOS_ENLACE;

  nueva: Partial<Marca> = this.formVacio();

  ngOnInit() {
    this.cargar();
  }

  private formVacio(): Partial<Marca> {
    return {
      nombre: '',
      descripcion: '',
      sitio_web_url: '',
      logo_url: '',
      orden: 0,
      enlaces: [],
    };
  }

  private async cargar() {
    try {
      this.marcas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  agregarEnlace(m: Partial<Marca>) {
    (m.enlaces ??= []).push({ tipo: 'instagram', url: '' });
  }

  quitarEnlace(m: Partial<Marca>, i: number) {
    m.enlaces?.splice(i, 1);
  }

  async crear() {
    if (!this.nueva.nombre?.trim()) return this.error.set('Falta el nombre.');
    this.error.set('');
    try {
      await this.srv.crear(this.nueva);
      this.nueva = this.formVacio();
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async guardar(m: Marca) {
    this.error.set('');
    try {
      await this.srv.actualizar(m.id, {
        nombre: m.nombre,
        descripcion: m.descripcion,
        sitio_web_url: m.sitio_web_url,
        logo_url: m.logo_url,
        orden: m.orden,
        enlaces: m.enlaces as EnlaceMarca[],
      });
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async eliminar(m: Marca) {
    const ok = await this.confirmar.confirm({
      titulo: '¿Eliminar la marca?',
      mensaje: `«${m.nombre}» dejará de aparecer en "Nuestras Marcas".`,
      cta: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await this.srv.eliminar(m.id);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}
