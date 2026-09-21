import { Component, OnInit, inject, signal } from '@angular/core';
import { MarcasService } from '../../../../core/services/marcas.service';
import { HeroMedia } from '../../components/hero-media/hero-media';
import { Colaboradores } from '../../components/colaboradores/colaboradores';
import type { Marca } from '../../../../core/models';

/**
 * "Directorio y sobre nosotros" (issue #34). El directorio de marcas usa
 * datos reales de `marcas` (misma tabla que el teaser de la portada); el
 * texto de "sobre nosotros" es contenido pendiente de que la clienta lo
 * confirme (ver issue #34).
 */
@Component({
  selector: 'app-directorio',
  standalone: true,
  imports: [HeroMedia, Colaboradores],
  templateUrl: './directorio.html',
  styleUrl: './directorio.scss',
})
export class Directorio implements OnInit {
  private readonly srv = inject(MarcasService);
  readonly marcas = signal<Marca[]>([]);

  async ngOnInit() {
    try {
      this.marcas.set(await this.srv.listar());
    } catch {
      /* el directorio es un extra sobre la página de texto, no bloquea nada */
    }
  }
}
