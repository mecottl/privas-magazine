/**
 * Sin red: prueba el candado contra SSRF de obtener-vista-previa-link
 * (issue "agregar todas las herramientas del editor") — un admin podría
 * pegar cualquier URL como link de un artículo, y esta función la va a
 * pedir con fetch() desde el servidor.
 *
 * Correr con: deno test supabase/functions/_tests/vista-previa-link.test.ts
 * (sin flags extra — solo importa lógica pura de _shared/link_preview.ts)
 */
import { assertEquals } from 'jsr:@std/assert@1';
import { esHostBloqueado, urlValida } from '../_shared/link_preview.ts';

Deno.test('bloquea localhost, loopback y rangos privados/metadata', () => {
  for (
    const h of [
      'localhost',
      '::1',
      '127.0.0.1',
      '10.0.0.5',
      '192.168.1.1',
      '172.16.0.1',
      '172.31.255.255',
      '169.254.169.254', // metadata de AWS/GCP/etc.
    ]
  ) {
    assertEquals(esHostBloqueado(h), true, h);
  }
});

Deno.test('deja pasar hosts públicos normales', () => {
  for (const h of ['privasmagazine.com', 'github.com', '172.15.0.1', '172.32.0.1']) {
    assertEquals(esHostBloqueado(h), false, h);
  }
});

Deno.test('urlValida rechaza protocolos que no sean http/https', () => {
  assertEquals(urlValida('javascript:alert(1)'), null);
  assertEquals(urlValida('file:///etc/passwd'), null);
  assertEquals(urlValida('ftp://ejemplo.com'), null);
  assertEquals(urlValida('no es una url'), null);
});

Deno.test('urlValida rechaza hosts bloqueados y acepta URLs normales', () => {
  assertEquals(urlValida('http://127.0.0.1:8080/'), null);
  assertEquals(urlValida('http://169.254.169.254/latest/meta-data/'), null);
  assertEquals(urlValida('https://privasmagazine.com/articulos')?.href, 'https://privasmagazine.com/articulos');
});
