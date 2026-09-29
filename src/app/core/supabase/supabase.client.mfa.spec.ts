import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.client';

/**
 * Issue #85: cuando una Edge Function de admin rechaza la llamada por MFA
 * (requireAdmin, del lado del servidor), el dispositivo "recordado" en
 * localStorage ya no sirve — invokeFunction debe olvidarlo y mandar a
 * verificar de verdad, en vez de dejar el JSON crudo del error suelto.
 */
function stubLocalStorage(): Storage {
  const datos = new Map<string, string>();
  return {
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
    clear: () => datos.clear(),
    key: () => null,
    get length() {
      return datos.size;
    },
  } as Storage;
}

describe('SupabaseService.invokeFunction — MFA requerido por el servidor', () => {
  let service: SupabaseService;
  let router: Router;

  beforeEach(() => {
    (globalThis as { localStorage: Storage }).localStorage = stubLocalStorage();
    localStorage.setItem('privas-mfa-confiable:uid-1', String(Date.now() + 999_999));

    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'gestion-privas/verificar-mfa', children: [] }])],
    });
    service = TestBed.inject(SupabaseService);
    router = TestBed.inject(Router);

    (service.client.auth as unknown as { getSession: () => Promise<unknown> }).getSession = () =>
      Promise.resolve({ data: { session: { user: { id: 'uid-1' } } } });
  });

  /** `client.functions` es un getter que crea un cliente nuevo en cada
   *  acceso — hay que reemplazar el getter mismo, no solo su `.invoke`. */
  function mockearInvoke(invoke: () => Promise<unknown>) {
    Object.defineProperty(service.client, 'functions', { value: { invoke }, configurable: true });
  }

  it('olvida el dispositivo y navega a verificar-mfa', async () => {
    const navegar = vi.spyOn(router, 'navigateByUrl');
    mockearInvoke(() =>
      Promise.resolve({
        data: null,
        error: new FunctionsHttpError({
          json: async () => ({ error: 'Verificación en dos pasos requerida.', codigo: 'mfa_requerido' }),
        }),
      }),
    );

    const res = await service.invokeFunction('subir-archivo', {});

    expect((res.data as { codigo?: string } | null)?.codigo).toBe('mfa_requerido');
    expect(localStorage.getItem('privas-mfa-confiable:uid-1')).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/gestion-privas/verificar-mfa');
  });

  it('un error normal no toca el dispositivo recordado ni navega', async () => {
    const navegar = vi.spyOn(router, 'navigateByUrl');
    mockearInvoke(() =>
      Promise.resolve({
        data: null,
        error: new FunctionsHttpError({ json: async () => ({ error: 'Formato no permitido' }) }),
      }),
    );

    await service.invokeFunction('subir-archivo', {});

    expect(localStorage.getItem('privas-mfa-confiable:uid-1')).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });
});
