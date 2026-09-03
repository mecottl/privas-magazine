/** Texto legible de un error (Supabase/PostgREST devuelve objetos, no Error). */
export function mensajeError(e: unknown): string {
  if (!e) return 'Error desconocido';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  const o = e as { message?: string; error?: string; details?: string; hint?: string };
  return o.message || o.error || o.details || o.hint || JSON.stringify(e);
}
