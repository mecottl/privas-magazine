import { Component, model } from '@angular/core';

/**
 *
 * Constructor de bloques libre: texto, imágenes, video embebido, layout libre.
 * ANTES de construir uno propio, evaluar TipTap / Editor.js / ngx-editor.
 * El contenido se serializa como JSON y se guarda en `articulos.contenido_json`.
 * El `extracto` se deriva automáticamente del texto plano al guardar
 * (NO lo escribe el usuario).
 */
@Component({
  selector: 'app-editor-contenido',
  standalone: true,
  template: `
    <div class="editor-contenido">
      <p>TODO: integrar librería de editor de bloques.</p>
    </div>
  `,
})
export class EditorContenido {
  /** JSON de bloques enlazado con el formulario del artículo. */
  readonly contenido = model<unknown>(null);
}
