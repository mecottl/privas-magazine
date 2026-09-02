/**
 * Tipos de la base de datos.
 *
 * Genera este archivo desde el esquema real (NO lo escribas a mano):
 *   npx supabase gen types typescript --project-id xiqqhjdpmqdnzsvpjhwq > src/app/core/models/database.types.ts
 *
 * Tablas existentes (ver CLAUDE.md): articulos, categorias, ediciones_revista,
 * perfiles_admin, marcas. Pendiente: suscriptores_newsletter (migración en
 * supabase/migrations).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
