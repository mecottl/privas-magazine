import { TestBed } from '@angular/core/testing';
import { Compartir } from './compartir';

function poner(nombre: string, valor: unknown) {
  Object.defineProperty(navigator, nombre, { value: valor, configurable: true, writable: true });
}
function quitar(nombre: string) {
  Reflect.deleteProperty(navigator, nombre);
}

/**
 * Botón "Compartir" (issue #83): usa el menú nativo si el navegador lo tiene
 * (iPhone, Android...); si no, abre un menú propio con opciones y copiar.
 */
describe('Compartir', () => {
  function montar() {
    const fixture = TestBed.createComponent(Compartir);
    fixture.componentRef.setInput('url', 'https://privasmagazine.com/articulos/hola mundo');
    fixture.componentRef.setInput('titulo', 'Un día en el mar');
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    quitar('share');
    quitar('clipboard');
  });

  it('con menú nativo lo abre y no muestra el menú propio', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    poner('share', share);
    const fixture = montar();

    await fixture.componentInstance.compartir();

    expect(share).toHaveBeenCalledWith({
      title: 'Un día en el mar',
      url: 'https://privasmagazine.com/articulos/hola mundo',
    });
    expect(fixture.componentInstance.menuAbierto()).toBe(false);
  });

  it('si la persona cierra el menú nativo no abre otro', async () => {
    poner('share', vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })));
    const fixture = montar();

    await fixture.componentInstance.compartir();

    expect(fixture.componentInstance.menuAbierto()).toBe(false);
  });

  it('sin menú nativo abre el menú propio con las opciones codificadas', async () => {
    const fixture = montar();

    await fixture.componentInstance.compartir();
    fixture.detectChanges();

    const enlaces = [...fixture.nativeElement.querySelectorAll('a.cmp__item')] as HTMLAnchorElement[];
    expect(enlaces.map((a) => a.textContent?.trim())).toEqual(['WhatsApp', 'Facebook', 'X', 'Telegram']);
    expect(enlaces[0].href).toContain('wa.me');
    expect(enlaces[0].href).toContain(encodeURIComponent('https://privasmagazine.com/articulos/hola mundo'));
    expect(fixture.nativeElement.textContent).toContain('Copiar enlace');
  });

  it('copiar escribe el enlace al portapapeles y avisa', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    poner('clipboard', { writeText });
    const fixture = montar();

    await fixture.componentInstance.copiar();

    expect(writeText).toHaveBeenCalledWith('https://privasmagazine.com/articulos/hola mundo');
    expect(fixture.componentInstance.copiado()).toBe(true);
  });
});
