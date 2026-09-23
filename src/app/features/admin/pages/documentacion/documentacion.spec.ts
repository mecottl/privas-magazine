import { TestBed } from '@angular/core/testing';
import { Documentacion } from './documentacion';

/**
 * El índice y las secciones se escriben a mano por separado (issue #81): si
 * alguien agrega/renombra una y olvida la otra, un enlace del índice quedaría
 * sin destino. Este test lo detecta.
 */
describe('Documentacion', () => {
  it('cada entrada del índice tiene su sección en la página', () => {
    const fixture = TestBed.createComponent(Documentacion);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    for (const s of fixture.componentInstance.secciones) {
      expect(el.querySelector(`#doc-${s.id}`), `falta la sección #doc-${s.id}`).not.toBeNull();
    }
  });

  it('ir() marca la sección activa y hace scroll a ella', () => {
    const fixture = TestBed.createComponent(Documentacion);
    fixture.detectChanges();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;

    fixture.componentInstance.ir('costos');

    expect(fixture.componentInstance.activa()).toBe('costos');
    expect(scroll).toHaveBeenCalled();
  });
});
