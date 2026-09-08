import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EdicionRevista } from '../../../../core/models';

const NOMBRE_TEMPORADA: Record<string, string> = {
  'primavera-verano': 'Primavera · Verano',
  'otono-invierno': 'Otoño · Invierno',
};

/**
 * Ficha de edición de la revista: cristal líquido, portada 4:5, sello
 * "Edición 0X" y etiqueta «Temporada Año». Toda la ficha enlaza al PDF.
 *
 * Con `edicion` en `null` renderiza el hueco "Próximamente" (usa
 * `temporadaEsperada` / `anioEsperado` para la etiqueta).
 */
@Component({
  selector: 'app-edicion-card',
  standalone: true,
  templateUrl: './edicion-card.html',
  styleUrl: './edicion-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EdicionCard {
  readonly edicion = input<EdicionRevista | null>(null);
  readonly numero = input.required<number>();
  readonly temporadaEsperada = input('');
  readonly anioEsperado = input<number | null>(null);
  /** Muestra el título de la revista y oculta el sello «Edición 0X». */
  readonly mostrarTitulo = input(false);

  /** Etiqueta «Temporada Año» en mayúsculas. */
  readonly etiqueta = computed(() => {
    const e = this.edicion();
    if (e) {
      return `${NOMBRE_TEMPORADA[e.temporada] ?? e.temporada} ${e.anio}`;
    }
    return `${this.temporadaEsperada()} ${this.anioEsperado() ?? ''}`.trim();
  });

  /** "Edición 01", "Edición 02", … */
  readonly sello = computed(
    () => `Edición ${String(this.numero()).padStart(2, '0')}`,
  );
}
