import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.client';

/**
 * Dispara recompilación + newsletter al publicar de inmediato (issue #64).
 * No fatal: si falla, no debe tumbar el flujo de "Publicar ahora" — el
 * artículo/edición ya quedó publicado en la base, esto es un extra.
 */
@Injectable({ providedIn: 'root' })
export class NotificarPublicacionService {
  private readonly supabase = inject(SupabaseService);

  async notificarArticulo(art: { id: string; titulo: string; slug: string }): Promise<void> {
    try {
      await this.supabase.invokeFunction('notificar-publicacion', { articulos: [art] });
    } catch {
      /* no fatal — ver comentario de la clase */
    }
  }

  async notificarEdicion(ed: { id: string; titulo: string }): Promise<void> {
    try {
      await this.supabase.invokeFunction('notificar-publicacion', { ediciones: [ed] });
    } catch {
      /* no fatal — ver comentario de la clase */
    }
  }
}
