import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.client';
import type { PerfilAdmin } from '../models';

/**
 * Estado de sesión del panel de administración.
 *
 * La creación de cuentas de admin NO ocurre aquí: la única vía autorizada
 * es la Edge Function `invitar-admin` (ver CLAUDE.md § 4).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly perfil = signal<PerfilAdmin | null>(null);
  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly esAdmin = computed(() => this.perfil() !== null);

  async init(): Promise<void> {
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
    if (!res.error) await this.cargarPerfil();
    return res;
  }

  async cerrarSesion() {
    await this.supabase.client.auth.signOut();
    this.perfil.set(null);
  }

  private async cargarPerfil(): Promise<void> {
    const { data } = await this.supabase.client
      .from('perfiles_admin')
      .select('id, nombre, nivel_permiso')
      .maybeSingle();
    this.perfil.set((data as PerfilAdmin) ?? null);
  }
}
