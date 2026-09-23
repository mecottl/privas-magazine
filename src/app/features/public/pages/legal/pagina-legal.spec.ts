import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PaginaLegal } from './pagina-legal';

/** Las dos rutas legales usan la misma plantilla y se distinguen por `data.doc`. */
describe('PaginaLegal', () => {
  function montar(doc: string) {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: { doc } } } }],
    });
    const fixture = TestBed.createComponent(PaginaLegal);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra el Aviso de Privacidad con sus secciones', () => {
    const el = montar('privacidad');
    expect(el.querySelector('h1')?.textContent).toContain('Aviso de Privacidad');
    expect(el.querySelectorAll('h2').length).toBe(8);
  });

  it('muestra los Términos y Condiciones', () => {
    const el = montar('terminos');
    expect(el.querySelector('h1')?.textContent).toContain('Términos y Condiciones');
    expect(el.querySelectorAll('h2').length).toBe(8);
  });
});
