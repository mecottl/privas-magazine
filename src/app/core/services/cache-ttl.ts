/**
 * Cache en memoria con TTL corto para listados públicos (issue #43).
 * No sobrevive un refresh de página (vive en la instancia del service) —
 * suficiente para que navegar entre / → /articulos → /revistas no repita
 * la misma consulta a Supabase.
 */
export function conCacheTTL<T>(ttlMs: number) {
  const cache = new Map<string, { valor: T; vence: number }>();

  return async (clave: string, cargar: () => Promise<T>): Promise<T> => {
    const hit = cache.get(clave);
    if (hit && hit.vence > Date.now()) return hit.valor;
    const valor = await cargar();
    cache.set(clave, { valor, vence: Date.now() + ttlMs });
    return valor;
  };
}
