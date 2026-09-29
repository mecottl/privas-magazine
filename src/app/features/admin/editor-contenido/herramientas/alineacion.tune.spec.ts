import { AlineacionTune } from './alineacion.tune';

/**
 * Tune de alineación escrita a mano (no hay ninguna oficial de Editor.js
 * que soporte "justificado") — cobertura mínima de guardar/leer/cambiar.
 */
describe('AlineacionTune', () => {
  const api = {} as never;
  const block = {} as never;

  it('por defecto queda en izquierda si no hay dato previo', () => {
    const tune = new AlineacionTune({ api, data: undefined, block });
    expect(tune.save()).toEqual({ alineacion: 'izquierda' });
  });

  it('respeta el dato guardado del bloque', () => {
    const tune = new AlineacionTune({ api, data: { alineacion: 'justificado' }, block });
    expect(tune.save()).toEqual({ alineacion: 'justificado' });
  });

  it('wrap() aplica la clase CSS de la alineación actual', () => {
    const tune = new AlineacionTune({ api, data: { alineacion: 'centro' }, block });
    const contenido = document.createElement('p');
    const wrapper = tune.wrap(contenido);
    expect(wrapper.classList.contains('ce-align-centro')).toBe(true);
    expect(wrapper.classList.contains('ce-align-izquierda')).toBe(false);
    expect(wrapper.contains(contenido)).toBe(true);
  });

  it('render() da las 4 opciones y activar una cambia lo que guarda save()', () => {
    const tune = new AlineacionTune({ api, data: undefined, block });
    tune.wrap(document.createElement('p'));
    const items = tune.render() as { title?: string; isActive?: boolean; onActivate: () => void }[];
    expect(items.map((i) => i.title)).toEqual([
      'Alinear a la izquierda',
      'Centrar',
      'Alinear a la derecha',
      'Justificar',
    ]);
    expect(items[0].isActive).toBe(true);

    items[3].onActivate();
    expect(tune.save()).toEqual({ alineacion: 'justificado' });
  });
});
