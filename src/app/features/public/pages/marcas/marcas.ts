import { Component, OnInit, inject, signal } from '@angular/core';
import { MarcasService } from '../../../../core/services/marcas.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { mensajeError } from '../../../../core/services/errores';
import type { EnlaceMarca, Marca } from '../../../../core/models';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './marcas.html',
  styleUrl: './marcas.scss',
})
export class Marcas implements OnInit {
  private readonly srv = inject(MarcasService);
  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  enlaces(m: Marca): EnlaceMarca[] {
    return (m.enlaces ?? []).filter((e) => e.url);
  }

  etiqueta(e: EnlaceMarca): string {
    return e.tipo === 'x' ? 'X' : e.tipo || 'enlace';
  }

  async ngOnInit() {
    try {
      this.marcas.set(await this.srv.listar());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
