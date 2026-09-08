import { Component, OnInit, inject, signal } from '@angular/core';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { EdicionCard } from '../../components/edicion-card/edicion-card';
import { HeroMedia } from '../../components/hero-media/hero-media';
import { mensajeError } from '../../../../core/services/errores';
import type { EdicionRevista } from '../../../../core/models';

/**
 * Biblioteca de ediciones de la revista (`/revistas`).
 * Misma estructura que la portada / categorías: hero a sangre + franja teal
 * con la rejilla de fichas (app-edicion-card).
 */
@Component({
  selector: 'app-revistas',
  standalone: true,
  imports: [RevealDirective, EdicionCard, HeroMedia],
  templateUrl: './revistas.html',
  styleUrl: './revistas.scss',
})
export class Revistas implements OnInit {
  private readonly srv = inject(EdicionesService);

  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);
  readonly skeletons = [0, 1, 2, 3];

  async ngOnInit() {
    try {
      this.ediciones.set(await this.srv.listarPublicas());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
