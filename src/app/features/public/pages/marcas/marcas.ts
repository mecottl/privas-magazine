import { Component, OnInit, inject, signal } from '@angular/core';
import { MarcasService } from '../../../../core/services/marcas.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { HeroMedia } from '../../components/hero-media/hero-media';
import { MarcaLinktree } from '../../components/marca-linktree/marca-linktree';
import { mensajeError } from '../../../../core/services/errores';
import type { Marca } from '../../../../core/models';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [RevealDirective, HeroMedia, MarcaLinktree],
  templateUrl: './marcas.html',
  styleUrl: './marcas.scss',
})
export class Marcas implements OnInit {
  private readonly srv = inject(MarcasService);

  readonly marcas = signal<Marca[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);
  readonly skeletons = [0, 1, 2, 3];

  readonly abierta = signal<Marca | null>(null);

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
