/**
 * Smoke tests de la superficie más sensible del proyecto (issue #74):
 * las Edge Functions que gestionan cuentas de admin deben rechazar
 * cualquier llamada sin sesión, siempre. Pega en vivo a las funciones ya
 * desplegadas (no hay entorno local de Edge Functions en este repo) — no
 * necesitan una cuenta real, solo confirman el candado de "sin token, no
 * pasa nada", que es exactamente el punto de `requireAdmin` en
 * `_shared/clients.ts`.
 *
 * Correr con: deno test --allow-net supabase/functions/_tests/permisos.test.ts
 */
import { assertEquals } from 'jsr:@std/assert@1';

const BASE = 'https://xiqqhjdpmqdnzsvpjhwq.supabase.co/functions/v1';

async function llamarSinSesion(fn: string) {
  return await fetch(`${BASE}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

Deno.test('invitar-admin rechaza una llamada sin sesión (401)', async () => {
  const res = await llamarSinSesion('invitar-admin');
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

Deno.test('set-admin-activo rechaza una llamada sin sesión (401)', async () => {
  const res = await llamarSinSesion('set-admin-activo');
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

Deno.test('auditar-huerfanos rechaza una llamada sin sesión (401)', async () => {
  const res = await llamarSinSesion('auditar-huerfanos');
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

Deno.test('invitar-admin rechaza un token inválido (401)', async () => {
  const res = await fetch(`${BASE}/invitar-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-que-no-existe',
    },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 401);
  await res.body?.cancel();
});
