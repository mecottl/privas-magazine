/**
 * Lógica pura de `obtener-vista-previa-link`, separada del `Deno.serve` para
 * poder testearla sin necesitar `--allow-net` (ver `_tests/vista-previa-link.test.ts`).
 */

const MAX_BYTES = 500_000; // no hace falta leer la página completa para <head>

/** Bloquea intentos obvios de usar esto como proxy hacia la red interna. */
export function esHostBloqueado(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '::1') return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // metadata de nubes (AWS/GCP/etc.)
  return false;
}

export function urlValida(crudo: string): URL | null {
  try {
    const u = new URL(crudo);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (esHostBloqueado(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

/** Lee como máximo MAX_BYTES del body — evita descargar páginas enormes solo por el <head>. */
export async function leerLimitado(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let texto = '';
  let leidos = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    leidos += value.byteLength;
    texto += decoder.decode(value, { stream: true });
    if (leidos >= MAX_BYTES || /<\/head>/i.test(texto)) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return texto;
}

function metaTag(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    'i',
  );
  return html.match(re)?.[1] ?? null;
}

export function extraerMeta(html: string, baseUrl: URL) {
  const title =
    metaTag(html, 'og:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
  const description = metaTag(html, 'og:description') ?? metaTag(html, 'description');
  const imagen = metaTag(html, 'og:image');
  return {
    title: title?.trim() || undefined,
    description: description?.trim() || undefined,
    image: imagen ? { url: new URL(imagen, baseUrl).href } : undefined,
  };
}
