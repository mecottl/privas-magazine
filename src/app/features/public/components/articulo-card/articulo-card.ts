import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { Articulo } from '../../../../core/models';

/**
 * Tarjeta de artículo (imagen + fecha/categoría + título + extracto).
 * Usada en el carrusel de la portada; pensada para reutilizarse en cualquier
 * listado de artículos en formato rejilla.
 */
@Component({
  selector: 'app-articulo-card',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './articulo-card.html',
  styleUrl: './articulo-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticuloCard {
  readonly articulo = input.required<Articulo>();
}
