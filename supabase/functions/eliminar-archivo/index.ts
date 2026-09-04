/**
 * eliminar-archivo (brief "limpieza automática de archivos huérfanos")
 *
 * Quién la llama: los triggers `articulos_limpiar_portada` y
 * `ediciones_limpiar_archivos` vía `pg_net` — NUNCA el frontend directo.
 * Igual valida el `CRON_SECRET` (mismo secreto que `programar-publicacion`)
 * para que no sea invocable públicamente.
 *
 * Recibe uno de:
 *   { path: string, target: 'supabase' | 'sftp' }
 *   { archivos: [{ path, target }, ...] }        // PDF + portada de una edición
 *
 * Lógica:
 *   - target 'supabase' → storage.from(bucket).remove([path]) con service_role.
 *   - target 'sftp'      → SFTP DELETE en public_html/uploads/<path>.
 *     (rama sin probar hasta que exista Hostinger — igual que subir-archivo.)
 *
 * Si el archivo ya no existe (borrado doble, o nunca se subió) NO falla
 * ruidosamente: lo registra y responde 200 igual.
 *
 * Secretos: CRON_SECRET, UPLOAD_BUCKET (default "uploads"),
 *           SFTP_HOST / SFTP_USER / SFTP_PASSWORD (solo rama sftp).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireCronSecret } from '../_shared/clients.ts';

type Target = 'supabase' | 'sftp';
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
        target: (r['target'] === 'sftp' ? 'sftp' : 'supabase') as Target,
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

async function borrarPorSftp(path: string): Promise<void> {
  const host = Deno.env.get('SFTP_HOST');
  const user = Deno.env.get('SFTP_USER');
  const password = Deno.env.get('SFTP_PASSWORD');
  if (!host || !user || !password) {
    throw new Error('Faltan credenciales SFTP (SFTP_HOST/USER/PASSWORD)');
  }

  const { default: SftpClient } = await import('npm:ssh2-sftp-client@11');
  const sftp = new SftpClient();
  const remotePath = `public_html/uploads/${path}`;
  try {
    await sftp.connect({ host, username: user, password });
    if (await sftp.exists(remotePath)) {
      await sftp.delete(remotePath);
    }
  } finally {
    await sftp.end().catch(() => {});
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
      if (a.target === 'sftp') await borrarPorSftp(a.path);
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
