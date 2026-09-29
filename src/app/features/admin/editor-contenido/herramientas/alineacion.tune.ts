import type { API, BlockAPI, BlockTune, BlockTuneConstructable } from '@editorjs/editorjs';

export type Alineacion = 'izquierda' | 'centro' | 'derecha' | 'justificado';

/**
 * Tune de alineación de texto (izquierda/centro/derecha/justificado) —
 * ninguna herramienta oficial de Editor.js la trae, y la única de la
 * comunidad conocida (`editorjs-text-alignment-blocktune`) no soporta
 * "justificado", así que es más simple (y más corto) escribir esta propia
 * que forzar esa librería a medias. Aplica a cualquier bloque de texto
 * (párrafo, encabezado, cita, lista) vía el menú "⋮" del bloque.
 *
 * Guarda `{ alineacion: '...' }` en `block.tunes.alineacion` — el frontend
 * público (`articulo-detalle.ts`) lee ese mismo dato para pintar la clase
 * CSS correspondiente.
 */
export class AlineacionTune implements BlockTune {
  static readonly isTune = true;

  private data: { alineacion: Alineacion };

  private static readonly OPCIONES: { valor: Alineacion; etiqueta: string; icono: string }[] = [
    {
      valor: 'izquierda',
      etiqueta: 'Alinear a la izquierda',
      icono:
        '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 4h14M3 8h9M3 12h14M3 16h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    },
    {
      valor: 'centro',
      etiqueta: 'Centrar',
      icono:
        '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 4h14M5.5 8h9M3 12h14M5.5 16h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    },
    {
      valor: 'derecha',
      etiqueta: 'Alinear a la derecha',
      icono:
        '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 4h14M8 8h9M3 12h14M8 16h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    },
    {
      valor: 'justificado',
      etiqueta: 'Justificar',
      icono:
        '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 4h14M3 8h14M3 12h14M3 16h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    },
  ];

  private readonly block: BlockAPI;

  constructor({ data, block }: { api: API; data?: { alineacion?: Alineacion }; block: BlockAPI }) {
    this.data = { alineacion: data?.alineacion ?? 'izquierda' };
    this.block = block;
  }

  private wrapper?: HTMLElement;

  wrap(contenidoDelBloque: HTMLElement): HTMLElement {
    this.wrapper = document.createElement('div');
    this.aplicarClase();
    this.wrapper.appendChild(contenidoDelBloque);
    return this.wrapper;
  }

  private aplicarClase(): void {
    if (!this.wrapper) return;
    for (const o of AlineacionTune.OPCIONES) {
      this.wrapper.classList.toggle(`ce-align-${o.valor}`, o.valor === this.data.alineacion);
    }
  }

  render() {
    return AlineacionTune.OPCIONES.map((o) => ({
      icon: o.icono,
      title: o.etiqueta,
      toggle: 'alineacion',
      isActive: this.data.alineacion === o.valor,
      onActivate: () => {
        this.data = { alineacion: o.valor };
        this.aplicarClase();
        // Sin esto, Editor.js nunca se entera de que el bloque cambió —
        // "Guardar cambios" seguía guardando los datos de ANTES del clic,
        // sin ningún error (issue reportada en vivo: la alineación se
        // perdía al refrescar). @editorjs/quote hace lo mismo en su propia
        // Tune de alineación (this.block.dispatchChange()).
        this.block.dispatchChange();
      },
    }));
  }

  save() {
    return this.data;
  }
}

export const AlineacionTuneClass = AlineacionTune as unknown as BlockTuneConstructable;
