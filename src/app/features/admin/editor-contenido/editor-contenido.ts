import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
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
  // Editor.js crea todo su DOM con document.createElement, fuera de
  // Angular — ninguno de esos nodos lleva el atributo de encapsulado, así
  // que con Emulated (el default) NINGUNA regla de editor-contenido.scss
  // aplicaba de verdad (ni las de antes — fuente de encabezados, tamaño de
  // imágenes — ni la de alineación nueva). Confirmado viendo el CSS ya
  // compilado: todo salía como `.editorjs-holder[_ngcontent-x] .ce-header
  // [_ngcontent-x]`, que nunca matchea porque .ce-header no tiene ese
  // atributo. Esta hoja SOLO estiliza el DOM que Editor.js inyecta dentro
  // de `.editorjs-holder`, así que None es lo correcto aquí, no un parche.
  encapsulation: ViewEncapsulation.None,
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
      // Traduce lo que trae Editor.js de fábrica en inglés (menú del bloque,
      // buscador de herramientas, etc.) — issue reportada en vivo. `toolNames`
      // traduce Negrita/Cursiva/Link (no tienen tools.<x>.config propio, son
      // internos); cada bloque de abajo ya trae su `toolbox.title` en español,
      // así que no dependen de este diccionario para su nombre.
      i18n: {
        messages: {
          ui: {
            blockTunes: { toggler: { 'Click to tune': 'Más opciones', 'or drag to move': 'o arrastra para mover' } },
            inlineToolbar: { converter: { 'Convert to': 'Convertir a' } },
            toolbar: { toolbox: { Add: 'Agregar' } },
            popover: { Filter: 'Buscar', 'Nothing found': 'Sin resultados', 'Convert to': 'Convertir a' },
          },
          toolNames: {
            Text: 'Texto',
            Heading: 'Encabezado',
            List: 'Lista',
            Warning: 'Aviso',
            Checklist: 'Lista de tareas',
            Quote: 'Cita',
            Delimiter: 'Separador',
            Table: 'Tabla',
            Link: 'Link',
            Image: 'Imagen',
            Bold: 'Negrita',
            Italic: 'Cursiva',
          },
          tools: {
            link: { 'Add a link': 'Pega un link…' },
            stub: { 'The block can not be displayed correctly.': 'Este bloque no se puede mostrar.' },
          },
          blockTunes: {
            delete: { Delete: 'Eliminar', 'Click to delete': 'Confirmar borrado' },
            moveUp: { 'Move up': 'Subir' },
            moveDown: { 'Move down': 'Bajar' },
          },
        },
      },
      tools: {
        alineacion: { class: AlineacionTuneClass },
        paragraph: {
          class: Paragraph as never,
          inlineToolbar: true,
          toolbox: { title: 'Texto' },
        },
        header: {
          class: Header as never,
          inlineToolbar: true,
          toolbox: { title: 'Encabezado' },
          config: {
            levels: [2, 3, 4],
            defaultLevel: 2,
            placeholder: 'Encabezado',
          },
        },
        quote: {
          class: Quote as never,
          inlineToolbar: true,
          toolbox: { title: 'Cita' },
          config: {
            quotePlaceholder: 'Escribe la cita',
            captionPlaceholder: 'Autor o fuente',
          },
        },
        list: {
          class: List as never,
          inlineToolbar: true,
          toolbox: { title: 'Lista' },
          config: { defaultStyle: 'unordered' },
        },
        checklist: {
          class: Checklist as never,
          inlineToolbar: true,
          toolbox: { title: 'Lista de tareas' },
        },
        table: {
          class: Table as never,
          inlineToolbar: true,
          toolbox: { title: 'Tabla' },
          config: { rows: 2, cols: 3 },
        },
        warning: {
          class: Warning as never,
          inlineToolbar: true,
          toolbox: { title: 'Aviso' },
          config: {
            titlePlaceholder: 'Título del aviso',
            messagePlaceholder: 'Mensaje',
          },
        },
        delimiter: { class: Delimiter as never, toolbox: { title: 'Separador' } },
        embed: { class: Embed as never, toolbox: { title: 'Video / embed' } },
        linkTool: {
          class: LinkTool as never,
          toolbox: { title: 'Link con vista previa' },
          config: {
            endpoint: `${environment.supabaseUrl}/functions/v1/obtener-vista-previa-link`,
          },
        },
        image: {
          class: ImageTool as never,
          toolbox: { title: 'Imagen' },
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
        marker: { class: Marker as never, toolbox: { title: 'Marcador' } },
        underline: { class: Underline as never, toolbox: { title: 'Subrayado' } },
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
