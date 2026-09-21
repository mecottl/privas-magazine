import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Estado de error con formato de marca (icono + texto + reintentar opcional)
 * — issue #52. Antes cada página pública mostraba `{{ error() }}` como texto
 * plano suelto en un `<p class="error">`.
 */
@Component({
  selector: 'app-error-aviso',
  standalone: true,
  templateUrl: './error-aviso.html',
  styleUrl: './error-aviso.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorAviso {
  readonly mensaje = input.required<string>();
  /** Franjas sobre fondo teal (ej. el carrusel de la portada) necesitan
   *  contraste distinto al de una página normal sobre papel/crema. */
  readonly sobreTeal = input(false);
  /** Solo se pinta el botón si el padre puede recargar algo de verdad. */
  readonly conReintentar = input(false);
  readonly reintentar = output<void>();
}
