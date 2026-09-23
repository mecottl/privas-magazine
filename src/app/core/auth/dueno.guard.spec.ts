import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { duenoGuard } from './dueno.guard';

/**
 * `/documentacion` (issue #81): solo entra un dueño con sesión completa; todos
 * los demás vuelven al landing `/`, nunca al login ni al dashboard.
 */
describe('duenoGuard', () => {
  function ejecutar(auth: { esDueno: boolean; mfaRequerido: boolean; confiable: boolean }) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            init: async () => {},
            esDueno: () => auth.esDueno,
            mfaRequerido: () => auth.mfaRequerido,
            mfaEsDispositivoConfiable: () => auth.confiable,
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => duenoGuard({} as never, {} as never));
  }

  it('sin sesión (no es dueño) manda al landing', async () => {
    const r = (await ejecutar({ esDueno: false, mfaRequerido: false, confiable: false })) as UrlTree;
    expect(r.toString()).toBe('/');
  });

  it('un admin que no es dueño manda al landing', async () => {
    const r = (await ejecutar({ esDueno: false, mfaRequerido: true, confiable: true })) as UrlTree;
    expect(r.toString()).toBe('/');
  });

  it('dueño con MFA pendiente en este dispositivo manda al landing', async () => {
    const r = (await ejecutar({ esDueno: true, mfaRequerido: true, confiable: false })) as UrlTree;
    expect(r.toString()).toBe('/');
  });

  it('dueño con MFA verificado entra', async () => {
    expect(await ejecutar({ esDueno: true, mfaRequerido: true, confiable: true })).toBe(true);
  });
});
