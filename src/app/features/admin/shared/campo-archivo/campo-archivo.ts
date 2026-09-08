import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Campo de subida de archivo para el panel. Antes de subir muestra un botón
 * "Elegir archivo"; una vez subido oculta el input nativo y muestra la
 * miniatura (imagen o ficha de documento) con "Ver" y "Cambiar".
 * El componente no sube nada: emite `(elegido)` con el File y el padre
 * llama a UploadsService.
 */
@Component({
  selector: 'app-campo-archivo',
  standalone: true,
  templateUrl: './campo-archivo.html',
  styleUrl: './campo-archivo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampoArchivo {
  /** URL del archivo ya subido (o null si aún no hay). */
  readonly url = input<string | null>(null);
  /** true → previsualiza como imagen; false → ficha de documento. */
  readonly imagen = input(false);
  readonly accept = input('');
  readonly subiendo = input(false);
  /** Texto del botón cuando aún no hay archivo. */
  readonly etiqueta = input('Elegir archivo');

  readonly elegido = output<File>();

  private readonly inp =
    viewChild.required<ElementRef<HTMLInputElement>>('inp');

  abrir() {
    this.inp().nativeElement.click();
  }

  alCambiar(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file) this.elegido.emit(file);
    (ev.target as HTMLInputElement).value = '';
  }
}
