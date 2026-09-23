/**
 * eliminar-archivo (brief "limpieza automática de archivos huérfanos")
 *
 * Quién la llama: los triggers `articulos_limpiar_portada` y
 * `ediciones_limpiar_archivos` vía `pg_net` — NUNCA el frontend directo.
 * Igual valida el `CRON_SECRET` (mismo secreto que `programar-publicacion`)
 * para que no sea invocable públicamente.
 *
 * Recibe uno de:
 *   { path: string, target: 'supabase' | 'ftp' }
 *   { archivos: [{ path, target }, ...] }        // PDF + portada de una edición
 *
 * Lógica:
 *   - target 'supabase' → storage.from(bucket).remove([path]) con service_role.
 *   - target 'ftp'       → FTP DELETE en <FTP_REMOTE_PREFIX>uploads/<path>
 *     (prefijo vacío por default — mismo criterio que subir-archivo, la
 *     cuenta FTP de Akky ya apunta a la raíz pública sin `public_html/`).
 *     Akky no tiene SFTP, solo FTP plano — intenta FTPS explícito primero,
 *     cae a FTP sin cifrar si el servidor lo rechaza.
 *
 * Si el archivo ya no existe (borrado doble, o nunca se subió) NO falla
 * ruidosamente: lo registra y responde 200 igual.
 *
 * Secretos: CRON_SECRET, UPLOAD_BUCKET (default "uploads"),
 *           FTP_HOST / FTP_USER / FTP_PASSWORD (solo rama ftp),
 *           FTP_REMOTE_PREFIX (opcional, default vacío — debe coincidir con
 *           el de subir-archivo).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireCronSecret } from '../_shared/clients.ts';

type Target = 'supabase' | 'ftp';
interface ArchivoRef {
  path: string;
  target: Target;
}

function normalizarEntrada(body: unknown): ArchivoRef[] {
  const b = (body ?? {}) as Record<string, unknown>;
  const crudos = Array.isArray(b['archivos'])
    ? (b['archivos'] as unknown[])
    : b['path']
      ? [{ path: b['path'], target: b['target'] }]
      : [];

  return crudos
    .map((x) => {
      const r = (x ?? {}) as Record<string, unknown>;
      return {
        path: typeof r['path'] === 'string' ? r['path'].trim() : '',
        target: (r['target'] === 'ftp' ? 'ftp' : 'supabase') as Target,
      };
    })
    .filter((a) => a.path.length > 0);
}

async function borrarDeSupabase(path: string): Promise<void> {
  const bucket = Deno.env.get('UPLOAD_BUCKET') ?? 'uploads';
  const { error } = await adminClient().storage.from(bucket).remove([path]);
  // storage.remove() no falla si el objeto no existe; un `error` aquí es algo
  // real (bucket inexistente, permisos, red).
  if (error) throw new Error(`Storage: ${error.message}`);
}

/**
 * Prefijo del directorio remoto antes de "uploads/...". Vacío por defecto —
 * ver la misma constante/comentario en subir-archivo/index.ts: en Akky la
 * cuenta FTP ya apunta a la raíz pública, sin `public_html/`. Debe coincidir
 * con `FTP_REMOTE_PREFIX` de subir-archivo o se intentará borrar en el lugar
 * equivocado.
 */
function prefijoRemoto(): string {
  const p = (Deno.env.get('FTP_REMOTE_PREFIX') ?? '').trim();
  return p ? `${p.replace(/^\/+|\/+$/g, '')}/` : '';
}

async function borrarPorFtp(path: string): Promise<void> {
  const host = Deno.env.get('FTP_HOST');
  const user = Deno.env.get('FTP_USER');
  const password = Deno.env.get('FTP_PASSWORD');
  if (!host || !user || !password) {
    throw new Error('Faltan credenciales FTP (FTP_HOST/USER/PASSWORD)');
  }

  const { Client } = await import('npm:basic-ftp@5');
  const remotePath = `${prefijoRemoto()}uploads/${path}`;

  let client = new Client();
  let conectado = false;
  try {
    await client.access({ host, user, password, secure: true });
    conectado = true;
  } catch {
    client.close();
    client = new Client();
  }
  try {
    if (!conectado) await client.access({ host, user, password, secure: false });
    // BUG real encontrado en vivo (issue #66 — reporte del cliente de
    // ediciones que nunca se limpiaban): `client.removeQuiet` NO EXISTE en
    // basic-ftp@5 — todo borrado por FTP tiraba "TypeError: client.removeQuiet
    // is not a function" desde que se escribió esta función, silencioso
    // porque el trigger llama a esto vía pg_net (fire-and-forget) y la
    // respuesta 200 de arriba no distinguía este error interno. `remove()`
    // sí existe pero lanza si el archivo ya no está — lo tratamos como éxito
    // (código 550, "no existe") igual que se pretendía con removeQuiet.
    try {
      await client.remove(remotePath);
    } catch (e) {
      const codigo = (e as { code?: number })?.code;
      if (codigo !== 550) throw e;
    }
  } finally {
    client.close();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    requireCronSecret(req);
  } catch (e) {
    return e instanceof Response ? e : json({ error: String(e) }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const archivos = normalizarEntrada(body);
  if (archivos.length === 0) {
    return json({ ok: true, borrados: 0, nota: 'sin archivos que borrar' });
  }

  const resultados: { path: string; target: Target; ok: boolean; error?: string }[] = [];
  for (const a of archivos) {
    try {
      if (a.target === 'ftp') await borrarPorFtp(a.path);
      else await borrarDeSupabase(a.path);
      resultados.push({ path: a.path, target: a.target, ok: true });
    } catch (e) {
      // No tumbar la respuesta: se registra y se sigue con el resto.
      console.error(`eliminar-archivo: falló ${a.target}:${a.path} →`, e);
      resultados.push({ path: a.path, target: a.target, ok: false, error: String(e) });
    }
  }

  return json({ ok: true, resultados });
});
