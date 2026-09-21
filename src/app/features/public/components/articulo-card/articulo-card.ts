import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { Articulo } from '../../../../core/models';

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
