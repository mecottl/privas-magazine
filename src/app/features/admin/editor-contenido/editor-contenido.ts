import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  effect,
  inject,
  model,
  viewChild,
} from '@angular/core';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Quote from '@editorjs/quote';
import List from '@editorjs/list';
import ImageTool from '@editorjs/image';
import { UploadsService } from '../../../core/services/uploads.service';
import type { BloqueContenido } from '../../../core/models';

/**
 * Editor de bloques del artículo (Editor.js).
 *
 * Herramientas: encabezado (h2–h4), párrafo, cita, lista (viñetas/numerada) e
 * imagen. La subida de imágenes reutiliza `UploadsService` → Edge Function
 * `subir-archivo` → Supabase Storage (mismo flujo que la portada).
 *
 * Emite/recibe el array `blocks` de Editor.js vía `contenido` (model), que el
 * formulario padre guarda tal cual en `articulos.contenido_json`.
 */
@Component({
  selector: 'app-editor-contenido',
  standalone: true,
  host: { class: 'editorjs-host' },
  templateUrl: './editor-contenido.html',
  styleUrl: './editor-contenido.scss',
})
export class EditorContenido implements AfterViewInit, OnDestroy {
  private readonly uploads = inject(UploadsService);
  private readonly zone = inject(NgZone);
  private readonly holder =
    viewChild.required<ElementRef<HTMLElement>>('holder');

  /** Array `blocks` de Editor.js — enlazado con el formulario del artículo. */
  readonly contenido = model<BloqueContenido[]>([]);

  private editor?: EditorJS;
  /** Serialización del último valor propio para no re-renderizar en bucle. */
  private ultimoSerial = '[]';

  constructor() {
    // El padre puede cargar el artículo DESPUÉS de que el editor arranca:
    // repintamos cuando llega un valor externo distinto al que emitimos.
    effect(() => {
      const blocks = this.contenido() ?? [];
      const editor = this.editor;
      if (!editor) return;
      const serial = JSON.stringify(blocks);
      if (serial === this.ultimoSerial) return;
      this.ultimoSerial = serial;
      void editor.isReady.then(() =>
        editor.render({ blocks: this.normalizar(blocks) }),
      );
    });
  }

  async ngAfterViewInit() {
    this.editor = new EditorJS({
      holder: this.holder().nativeElement,
      minHeight: 200,
      placeholder: 'Escribe el artículo…',
      data: { blocks: this.normalizar(this.contenido() ?? []) },
      tools: {
        header: {
          class: Header as never,
          inlineToolbar: true,
          config: {
            levels: [2, 3, 4],
            defaultLevel: 2,
            placeholder: 'Encabezado',
          },
        },
        quote: {
          class: Quote as never,
          inlineToolbar: true,
          config: {
            quotePlaceholder: 'Escribe la cita',
            captionPlaceholder: 'Autor o fuente',
          },
        },
        list: {
          class: List as never,
          inlineToolbar: true,
          config: { defaultStyle: 'unordered' },
        },
        image: {
          class: ImageTool as never,
          config: {
            captionPlaceholder: 'Pie de foto',
            buttonContent: 'Seleccionar imagen',
            uploader: {
              uploadByFile: async (file: File) => {
                const url = await this.uploads.subir(file, 'articulo-portada');
                return { success: 1, file: { url } };
              },
            },
          },
        },
      },
      onChange: async () => {
        if (!this.editor) return;
        const salida = await this.editor.save();
        const blocks = (salida.blocks ?? []) as BloqueContenido[];
        this.ultimoSerial = JSON.stringify(blocks);
        this.zone.run(() => this.contenido.set(blocks));
      },
    });

    await this.editor.isReady;
    this.ultimoSerial = JSON.stringify(this.contenido() ?? []);
  }

  ngOnDestroy() {
    this.editor?.destroy?.();
    this.editor = undefined;
  }

  /**
   * Acepta el formato viejo `{ tipo, contenido }` (artículos previos al editor)
   * y lo convierte a bloques `paragraph` de Editor.js.
   */
  private normalizar(
    blocks: readonly (BloqueContenido | { tipo?: string; contenido?: string })[],
  ): BloqueContenido[] {
    return blocks
      .map((b) => {
        if ('type' in b && b.type) return b as BloqueContenido;
        const viejo = b as { contenido?: string };
        return {
          type: 'paragraph',
          data: { text: viejo.contenido ?? '' },
        } satisfies BloqueContenido;
      })
      .filter((b) => b.type);
  }
}
