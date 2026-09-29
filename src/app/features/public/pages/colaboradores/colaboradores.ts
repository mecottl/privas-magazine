import { Component, OnInit, inject, signal } from '@angular/core';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { HeroMedia } from '../../components/hero-media/hero-media';

/**
 * Créditos de quienes han escrito para la revista (antes era una lista fija
 * dentro de "Directorio y sobre nosotros" con el equipo interno; ahora ese
 * equipo vive en /directorio y esto pasa a ser dinámico).
 *
 * Se arma con el mismo dato que ya usa el byline público del artículo
 * (`autor_texto`, ver articulo-detalle.html) — un artículo sin autor_texto
 * (autor_tipo 'usuario') no aporta nombre aquí, igual que ahí no se resuelve
 * a un nombre público.
 */
@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [HeroMedia],
  templateUrl: './colaboradores.html',
  styleUrl: './colaboradores.scss',
})
export class Colaboradores implements OnInit {
  private readonly srv = inject(ArticulosService);
  readonly nombres = signal<string[]>([]);
  readonly cargando = signal(true);

  async ngOnInit() {
    try {
      const articulos = await this.srv.listarPublicos();
      const set = new Set(
        articulos
          .map((a) => a.autor_texto?.trim())
          .filter((n): n is string => !!n),
      );
      this.nombres.set([...set].sort((a, b) => a.localeCompare(b, 'es')));
    } finally {
      this.cargando.set(false);
    }
  }
}
