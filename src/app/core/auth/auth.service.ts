import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.client';
import type { PerfilAdmin } from '../models';

/**
 * Estado de sesión del panel de administración.
 *
 * La creación de cuentas de admin NO ocurre aquí: la única vía autorizada
 * es la Edge Function `invitar-admin` (ver CLAUDE.md → tabla de Edge Functions).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly perfil = signal<PerfilAdmin | null>(null);
  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly esAdmin = computed(() => this.perfil() !== null);
  readonly esAdminTotal = computed(() => this.perfil()?.nivel_permiso === 'admin_total');
  /** Poder absoluto: el único que cambia niveles, restablece contraseñas
   *  ajenas, o gestiona cuentas que no sean de nivel 'editor'. */
  readonly esDueno = computed(() => this.perfil()?.nivel_permiso === 'dueno');
  /** admin_total o dueño — quienes ven la pantalla de Administradores y
   *  pueden editar cualquier artículo, no solo el propio. */
  readonly tieneAccesoTotal = computed(() => this.esAdminTotal() || this.esDueno());

  private iniciado?: Promise<void>;

  /** Idempotente: se puede llamar desde el app initializer y desde el guard. */
  init(): Promise<void> {
    return (this.iniciado ??= this.arrancar());
  }

  private async arrancar(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    this.session.set(data.session);
    if (data.session) await this.cargarPerfil();

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      if (session) void this.cargarPerfil();
      else this.perfil.set(null);
    });
  }

  async iniciarSesion(email: string, password: string) {
    const res = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (!res.error) {
      this.session.set(res.data.session);
      await this.cargarPerfil();
    }
    return res;
  }

  async cerrarSesion() {
    await this.supabase.client.auth.signOut();
    this.perfil.set(null);
  }

  /**
   * Cualquier admin puede cambiar su propio nombre visible — es un UPDATE
   * directo porque la RLS ya lo permite, pero solo esa columna: la
   * migración `restringir_autoedicion_y_borrado_admin` le quitó a
   * `authenticated` el GRANT de UPDATE sobre `nivel_permiso`/`activo`, así
   * que no hay forma de que esto sirva para auto-promoverse.
   */
  async actualizarNombre(nombre_visible: string): Promise<void> {
    const uid = this.session()?.user?.id;
    if (!uid) throw new Error('No hay sesión activa.');
    const { error } = await this.supabase.client
      .from('perfiles_admin')
      .update({ nombre_visible })
      .eq('id', uid);
    if (error) throw error;
    const actual = this.perfil();
    if (actual) this.perfil.set({ ...actual, nombre_visible });
  }

  /**
   * Cambiar la propia contraseña ES un cambio legítimo de sesión, pero debe
   * pasar por aquí — una acción deliberada del panel, con la sesión ya
   * autenticada de verdad — y no por `aceptar-invitacion`, que solo debe
   * servir para completar una invitación real (ver el chequeo de `#error`
   * en ese componente).
   */
  async actualizarPassword(password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.updateUser({ password });
    if (error) throw error;
  }

  // --- MFA por correo (issue #17) -----------------------------------------
  // Propio, no el TOTP nativo de Supabase: sin apps de autenticador ni QR
  // (pensado para que no sea tedioso para el dueño), y con "recordar este
  // dispositivo" un tiempo — algo que el MFA nativo de Supabase no soporta.
  // Obligatorio para 'dueno' sin importar `perfil.mfa_activo` (ver
  // adminGuard); opcional y autoactivable para 'admin_total'/'editor'.

  private static readonly MFA_RECORDAR_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

  private mfaClaveLocalStorage(): string | null {
    const uid = this.session()?.user?.id;
    return uid ? `privas-mfa-confiable:${uid}` : null;
  }

  /** ¿Este navegador ya pasó el MFA hace poco para esta cuenta? */
  mfaEsDispositivoConfiable(): boolean {
    const clave = this.mfaClaveLocalStorage();
    if (!clave) return false;
    try {
      const hasta = Number(localStorage.getItem(clave) ?? '0');
      return hasta > Date.now();
    } catch {
      return false; // sin storage disponible, mejor pedir el código
    }
  }

  private mfaMarcarDispositivoConfiable(): void {
    const clave = this.mfaClaveLocalStorage();
    if (!clave) return;
    try {
      localStorage.setItem(clave, String(Date.now() + AuthService.MFA_RECORDAR_MS));
    } catch {
      /* si no hay storage, simplemente se volverá a pedir la próxima vez */
    }
  }

  /** ¿Esta cuenta necesita pasar por MFA? Obligatorio para dueño. */
  mfaRequerido(): boolean {
    return this.esDueno() || this.perfil()?.mfa_activo === true;
  }

  /** Manda el código de 6 dígitos por correo (Edge Function `mfa-enviar-codigo`). */
  async mfaEnviarCodigo(): Promise<void> {
    const { data, error } = await this.supabase.invokeFunction<{
      ok?: boolean;
      error?: string;
    }>('mfa-enviar-codigo', {});
    if (error) {
      const detalle = (data as { error?: string } | null)?.error;
      throw new Error(detalle ?? error.message);
    }
  }

  /** Verifica el código y, si es válido, recuerda este dispositivo 30 días. */
  async mfaVerificarCodigo(codigo: string): Promise<void> {
    const { data, error } = await this.supabase.invokeFunction<{
      ok?: boolean;
      error?: string;
    }>('mfa-verificar-codigo', { codigo });
    if (error) {
      const detalle = (data as { error?: string } | null)?.error;
      throw new Error(detalle ?? error.message);
    }
    this.mfaMarcarDispositivoConfiable();
  }

  /** Autoservicio para admin_total/editor — a 'dueno' no le hace nada (ver
   *  mfaRequerido, que ignora esta columna para ese nivel). */
  async mfaActivarParaMiCuenta(activo: boolean): Promise<void> {
    const uid = this.session()?.user?.id;
    if (!uid) throw new Error('No hay sesión activa.');
    const { error } = await this.supabase.client
      .from('perfiles_admin')
      .update({ mfa_activo: activo })
      .eq('id', uid);
    if (error) throw error;
    const actual = this.perfil();
    if (actual) this.perfil.set({ ...actual, mfa_activo: activo });
  }

  private async cargarPerfil(): Promise<void> {
    // El id del usuario autenticado. SIN este filtro, como la policy de SELECT
    // deja a un admin ver TODOS los perfiles, `.maybeSingle()` falla en cuanto
    // existe más de un admin y el propio usuario aparece como "no admin".
    const uid = this.session()?.user?.id;
    if (!uid) {
      this.perfil.set(null);
      return;
    }
    const { data } = await this.supabase.client
      .from('perfiles_admin')
      .select('id, nombre_visible, nivel_permiso, activo, mfa_activo')
      .eq('id', uid)
      .maybeSingle();
    const perfil = (data as PerfilAdmin) ?? null;
    // Solo cuenta como admin si el perfil está activo.
    this.perfil.set(perfil?.activo ? perfil : null);
  }
}
