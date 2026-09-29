/**
 * obtener-vista-previa-link
 *
 * Quién la llama: el editor de bloques del panel (`@editorjs/link`), al
 * pegar una URL sola en un artículo — trae título/descripción/imagen para
 * armar la tarjeta de vista previa.
 *
 * Pública por diseño (issue "agregar todas las herramientas del editor"):
 * `@editorjs/link` pide los datos con un GET plano del navegador al
 * endpoint que se le configure, sin adjuntar el JWT del admin — exigir
 * sesión aquí obligaría a mantener el token sincronizado a mano en la
 * config del editor, y esto no expone nada propio: solo lee metadata
 * pública de una URL que el propio admin eligió pegar. Con rate limiting
 * (mismo criterio que suscribirse/confirmar-suscripcion, issue #15) y
 * validaciones contra abusarla como proxy hacia direcciones internas
 * (`_shared/link_preview.ts`, con su propio test sin red).
 *
 * GET/POST `?url=` o body `{ url }` (el tool de Editor.js manda GET).
 */
import { corsHeaders, fijarOrigenCors, json } from '../_shared/cors.ts';
import { dentroDelLimite, ipDeRequest } from '../_shared/rate_limit.ts';
import { extraerMeta, leerLimitado, urlValida } from '../_shared/link_preview.ts';

const TIMEOUT_MS = 6000;

Deno.serve(async (req) => {
  fijarOrigenCors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const dentro = await dentroDelLimite('obtener-vista-previa-link', ipDeRequest(req), 15, 10);
  if (!dentro) return json({ success: 0 }, 429);

  const params = new URL(req.url).searchParams;
  const crudo = params.get('url') ?? (await req.json().catch(() => ({})))?.url;
  if (typeof crudo !== 'string' || !crudo) return json({ success: 0 }, 400);

  const url = urlValida(crudo);
  if (!url) return json({ success: 0 }, 400);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrivasMagazineBot/1.0)' },
    });
    if (!res.ok) return json({ success: 0 }, 200);

    const html = await leerLimitado(res);
    const meta = extraerMeta(html, url);
    return json({ success: 1, meta });
  } catch {
    return json({ success: 0 }, 200);
  }
});
