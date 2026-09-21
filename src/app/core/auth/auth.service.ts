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
  /** false para 'editor' — gestionar otras cuentas de admin es solo admin_total. */
  readonly esAdminTotal = computed(() => this.perfil()?.nivel_permiso === 'admin_total');

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
      .select('id, nombre_visible, nivel_permiso, activo')
      .eq('id', uid)
      .maybeSingle();
    const perfil = (data as PerfilAdmin) ?? null;
    // Solo cuenta como admin si el perfil está activo.
    this.perfil.set(perfil?.activo ? perfil : null);
  }
}
