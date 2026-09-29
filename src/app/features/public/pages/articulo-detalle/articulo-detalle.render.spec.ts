import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ArticuloDetalle } from './articulo-detalle';
import type { BloqueContenido } from '../../../../core/models';

/**
 * Cobertura de los helpers que traducen los bloques nuevos de Editor.js
 * (checklist, tabla, embed, link) al HTML público — no monta el componente
 * completo (ngOnInit pega a Supabase), solo construye la instancia para
 * poder llamar sus métodos de render directo.
 */
describe('ArticuloDetalle — render de bloques nuevos', () => {
  let comp: ArticuloDetalle;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null }, data: {} } } },
      ],
    });
    comp = TestBed.createComponent(ArticuloDetalle).componentInstance;
  });

  function bloque(type: string, data: Record<string, unknown>, tunes?: BloqueContenido['tunes']): BloqueContenido {
    return { type, data, tunes };
  }

  it('checklistItems lee texto y checked, ignora formatos raros', () => {
    const b = bloque('checklist', { items: [{ text: 'Uno', checked: true }, { text: 'Dos', checked: false }] });
    expect(comp.checklistItems(b)).toEqual([
      { text: 'Uno', checked: true },
      { text: 'Dos', checked: false },
    ]);
  });

  it('tablaFilas y tablaConEncabezado leen el formato de @editorjs/table', () => {
    const b = bloque('table', { withHeadings: true, content: [['A', 'B'], ['1', '2']] });
    expect(comp.tablaConEncabezado(b)).toBe(true);
    expect(comp.tablaFilas(b)).toEqual([['A', 'B'], ['1', '2']]);
  });

  it('embedUrl solo confía en https, nunca en javascript: ni similares', () => {
    const bienSanitized = comp.embedUrl(bloque('embed', { embed: 'https://www.youtube.com/embed/xyz' }));
    expect(bienSanitized).not.toBeNull();

    expect(comp.embedUrl(bloque('embed', { embed: 'javascript:alert(1)' }))).toBeNull();
    expect(comp.embedUrl(bloque('embed', { embed: 'http://sitio.com/x' }))).toBeNull(); // solo https
    expect(comp.embedUrl(bloque('embed', {}))).toBeNull();
  });

  it('linkUrl/linkMeta/linkDominio leen el formato de @editorjs/link', () => {
    const b = bloque('linkTool', {
      link: 'https://www.ejemplo.com/articulo?x=1',
      meta: { title: 'Título', description: 'Desc', image: { url: 'https://ejemplo.com/img.jpg' } },
    });
    expect(comp.linkUrl(b)).toBe('https://www.ejemplo.com/articulo?x=1');
    expect(comp.linkMeta(b).title).toBe('Título');
    expect(comp.linkDominio(b)).toBe('ejemplo.com');
  });

  it('linkDominio no truena con una URL vacía o inválida', () => {
    expect(comp.linkDominio(bloque('linkTool', {}))).toBe('');
  });

  it('alineacionClase refleja la Tune propia y no marca nada si es la izquierda por defecto', () => {
    const centrado = bloque('paragraph', { text: 'x' }, { alineacion: { alineacion: 'centro' } });
    expect(comp.alineacionClase(centrado)).toBe('align-centro');

    const izquierda = bloque('paragraph', { text: 'x' }, { alineacion: { alineacion: 'izquierda' } });
    expect(comp.alineacionClase(izquierda)).toBe('');

    const sinTune = bloque('paragraph', { text: 'x' });
    expect(comp.alineacionClase(sinTune)).toBe('');
  });
});
