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
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import Table from '@editorjs/table';
import Warning from '@editorjs/warning';
import Delimiter from '@editorjs/delimiter';
import Embed from '@editorjs/embed';
import LinkTool from '@editorjs/link';
import ImageTool from '@editorjs/image';
import Marker from '@editorjs/marker';
import Underline from '@editorjs/underline';
import { UploadsService } from '../../../core/services/uploads.service';
import type { BloqueContenido } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { AlineacionTuneClass } from './herramientas/alineacion.tune';

/**
 * Editor de bloques del artículo (Editor.js).
 *
 * Herramientas: párrafo, encabezado (h2–h4), cita, lista (viñetas/numerada),
 * checklist, tabla, aviso, separador, imagen y embed (YouTube/Vimeo/
 * Instagram/Twitter/etc., cualquiera que Editor.js reconozca). "linkTool"
 * pega una URL sola y arma una tarjeta con su vista previa (Edge Function
 * `obtener-vista-previa-link`). Para "un link con su propio texto" ('URL con
 * sobrenombre') NO hace falta ninguna librería aparte: seleccionar texto y
 * usar el ícono de link del menú flotante ya lo hace — es la herramienta
 * "link" que Editor.js trae de fábrica (junto con negritas/cursivas),
 * disponible en cualquier bloque con `inlineToolbar: true`. Marcador y
 * subrayado sí son paquetes aparte. Alineación (izquierda/centro/derecha/
 * justificado) es una Tune propia (`herramientas/alineacion.tune.ts`)
 * disponible en cualquier bloque de texto vía su menú "⋮".
 *
 * La subida de imágenes reutiliza `UploadsService` → Edge Function
 * `subir-archivo` → Supabase Storage (mismo flujo que la portada).
 *
 * Emite/recibe el array `blocks` de Editor.js vía `contenido` (model), que el
 * formulario padre guarda tal cual en `articulos.contenido_json`. El
 * renderer público (`articulo-detalle.ts`) debe saber pintar cada tipo de
 * bloque que se agregue aquí.
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
      // Alineación disponible en todos los bloques que no digan lo contrario.
      tunes: ['alineacion'],
      tools: {
        alineacion: { class: AlineacionTuneClass },
        paragraph: {
          class: Paragraph as never,
          inlineToolbar: true,
        },
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
        checklist: {
          class: Checklist as never,
          inlineToolbar: true,
        },
        table: {
          class: Table as never,
          inlineToolbar: true,
          config: { rows: 2, cols: 3 },
        },
        warning: {
          class: Warning as never,
          inlineToolbar: true,
          config: {
            titlePlaceholder: 'Título del aviso',
            messagePlaceholder: 'Mensaje',
          },
        },
        delimiter: { class: Delimiter as never },
        embed: { class: Embed as never },
        linkTool: {
          class: LinkTool as never,
          config: {
            endpoint: `${environment.supabaseUrl}/functions/v1/obtener-vista-previa-link`,
          },
        },
        image: {
          class: ImageTool as never,
          config: {
            captionPlaceholder: 'Pie de foto',
            buttonContent: 'Seleccionar imagen',
            uploader: {
              uploadByFile: async (file: File) => {
                // subir() devuelve { url, path, target }; Editor.js espera
                // file.url como STRING — hay que sacar solo la url.
                const { url } = await this.uploads.subir(file, 'articulo-portada');
                return { success: 1, file: { url } };
              },
            },
          },
        },
        // --- herramientas en línea (seleccionar texto) ---
        // negritas, cursivas y link ("URL con sobrenombre") ya vienen de
        // fábrica con Editor.js — no hace falta registrarlas.
        marker: { class: Marker as never },
        underline: { class: Underline as never },
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
