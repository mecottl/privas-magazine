import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MenuOpciones } from './menu-opciones';

@Component({
  imports: [MenuOpciones],
  template: `<app-menu-opciones><button role="menuitem">Editar</button></app-menu-opciones>`,
})
class Host {}

describe('MenuOpciones', () => {
  it('abre con el ⋮, muestra las opciones y se cierra al elegir una', () => {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role="menu"]')).toBeNull();

    (el.querySelector('.mo__btn') as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('[role="menu"] [role="menuitem"]')?.textContent).toBe('Editar');

    (el.querySelector('[role="menuitem"]') as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('[role="menu"]')).toBeNull();
  });
});
