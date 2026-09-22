import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.client';
import type { PerfilAdmin } from '../models';

/**
 * Cobertura mínima de las reglas de MFA (issue #17): obligatorio para
 * dueño sin importar `mfa_activo`, opcional (autoservicio) para el resto,
 * y "recordar este dispositivo" por 30 días vía localStorage.
 */
/** El entorno de test (Vitest en Node) no trae `localStorage` global —
 *  se stubea en memoria, es lo único que usa AuthService de él. */
function stubLocalStorage(): Storage {
  const datos = new Map<string, string>();
  return {
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

describe('AuthService — reglas de MFA', () => {
  let service: AuthService;

  beforeEach(() => {
    (globalThis as { localStorage: Storage }).localStorage = stubLocalStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: {} } }],
    });
    service = TestBed.inject(AuthService);
  });

  function conPerfil(nivel: PerfilAdmin['nivel_permiso'], mfaActivo: boolean) {
    service.perfil.set({
      id: 'admin-1',
      nombre_visible: 'Prueba',
      nivel_permiso: nivel,
      activo: true,
      mfa_activo: mfaActivo,
    });
  }

  it('es obligatorio para dueño aunque mfa_activo sea false', () => {
    conPerfil('dueno', false);
    expect(service.mfaRequerido()).toBe(true);
  });

  it('es opcional para admin_total según mfa_activo', () => {
    conPerfil('admin_total', false);
    expect(service.mfaRequerido()).toBe(false);

    conPerfil('admin_total', true);
    expect(service.mfaRequerido()).toBe(true);
  });

  it('es opcional para editor según mfa_activo', () => {
    conPerfil('editor', false);
    expect(service.mfaRequerido()).toBe(false);

    conPerfil('editor', true);
    expect(service.mfaRequerido()).toBe(true);
  });

  it('sin sesión, el dispositivo nunca es confiable', () => {
    expect(service.mfaEsDispositivoConfiable()).toBe(false);
  });

  it('recuerda el dispositivo mientras no pase el plazo guardado', () => {
    service.session.set({ user: { id: 'uid-1' } } as never);

    localStorage.setItem('privas-mfa-confiable:uid-1', String(Date.now() + 1000));
    expect(service.mfaEsDispositivoConfiable()).toBe(true);

    localStorage.setItem('privas-mfa-confiable:uid-1', String(Date.now() - 1000));
    expect(service.mfaEsDispositivoConfiable()).toBe(false);
  });
});
