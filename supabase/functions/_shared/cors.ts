/**
 * Origen permitido (issue #88): antes era '*' en las 12 funciones, incluidas
 * las de solo-admin. El Bearer token (no cookies) ya limitaba el riesgo real
 * —quien no tenga el JWT no puede adjuntarlo—, pero restringir el origen es
 * más correcto igual. `SITE_URL` es la misma variable que ya usan
 * `programar-publicacion`/`invitar-admin` (ver docs/SECRETS.md).
 *
 * Para probar en local con `supabase functions serve`, exporta
 * `SITE_URL=http://localhost:4200` antes de levantarlo.
 */
const origenPermitido = Deno.env.get('SITE_URL') ?? 'https://privasmagazine.com';

export const corsHeaders = {
  'Access-Control-Allow-Origin': origenPermitido,
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
