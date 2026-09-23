import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { activarModoPreview, modoPreviewActivo } from '../../../../core/preview-mode';
import { PreviewBar } from './preview-bar';

/** El entorno de test (Node) no trae sessionStorage — stub en memoria. */
function stubSessionStorage() {
  const datos = new Map<string, string>();
  (globalThis as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
    key: () => null,
    get length() {
      return datos.size;
    },
  };
}

/**
 * Modo vista previa (issue #82): la barra solo aparece con una sesión de
 * admin real; un visitante con la bandera puesta nunca la ve.
 */
describe('PreviewBar', () => {
  function montar(esAdmin: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { init: async () => {}, esAdmin: () => esAdmin } },
      ],
    });
    const fixture = TestBed.createComponent(PreviewBar);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    stubSessionStorage();
    activarModoPreview();
  });

  it('con sesión de admin muestra la barra', async () => {
    const fixture = montar(true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Modo vista previa');
  });

  it('sin sesión de admin no muestra nada y apaga la bandera', async () => {
    const fixture = montar(false);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(false);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
    expect(modoPreviewActivo()).toBe(false);
  });

  it('"Volver al panel" apaga la bandera y navega al dashboard', async () => {
    const fixture = montar(true);
    await fixture.whenStable();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.componentInstance.volverAlPanel();

    expect(modoPreviewActivo()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['gestion-privas', 'dashboard']);
  });

  it('"Ocultar" sale del modo y esconde la barra', async () => {
    const fixture = montar(true);
    await fixture.whenStable();

    fixture.componentInstance.ocultar();

    expect(fixture.componentInstance.visible()).toBe(false);
    expect(modoPreviewActivo()).toBe(false);
  });
});
