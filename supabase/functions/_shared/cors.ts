/**
 * Origen permitido (issue #88): antes era '*' en las 12 funciones, incluidas
 * las de solo-admin. El Bearer token (no cookies) ya limitaba el riesgo real
 * —quien no tenga el JWT no puede adjuntarlo—, pero restringir el origen es
 * más correcto igual. `SITE_URL` es la misma variable que ya usan
 * `programar-publicacion`/`invitar-admin` (ver docs/SECRETS.md).
 *
 * Un solo origen fijo rompía las pruebas locales contra las funciones ya
 * desplegadas (localhost bloqueado por CORS) — reportado en vivo tras el fix
 * de #88. Ahora se refleja el `Origin` de la petición cuando es el sitio real
 * o un `localhost`/`127.0.0.1` de desarrollo (cualquier puerto); cualquier
 * otro origen cae al sitio real por defecto (equivalente a no matchear, el
 * navegador rechaza la respuesta igual).
 *
 * `fijarOrigenCors(req)` debe llamarse como PRIMERA línea del handler de
 * cada función (o del helper compartido que haga de handler), antes de
 * cualquier `json(...)` u OPTIONS con `corsHeaders`.
 */
const sitioReal = Deno.env.get('SITE_URL') ?? 'https://privasmagazine.com';

function esOrigenDeDesarrollo(origen: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);
}

let origenActual = sitioReal;

export function fijarOrigenCors(req: Request): void {
  const origen = req.headers.get('origin') ?? '';
  origenActual =
    origen === sitioReal || esOrigenDeDesarrollo(origen) ? origen : sitioReal;
}

export const corsHeaders = {
  get 'Access-Control-Allow-Origin'() {
    return origenActual;
  },
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
