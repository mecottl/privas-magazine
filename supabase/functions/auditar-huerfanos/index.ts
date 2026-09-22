/**
 * auditar-huerfanos (issue #66)
 *
 * Quién la llama: dueño/admin_total desde el panel, a demanda (botón "Auditar
 * ahora") — no hay cron para esto, es una revisión periódica manual.
 *
 * Compara lo que la base de datos dice que debería existir en el FTP de
 * Akky (`*_path` con `*_target = 'ftp'` en articulos/ediciones_revista, más
 * `marcas.logo_url` si apunta a `FTP_PUBLIC_BASE_URL`) contra el árbol real
 * de `uploads/` por FTP.
 *
 * A propósito SOLO reporta — nunca borra nada. Igual que `deploy.yml`, que
 * nunca toca `uploads/` para no arriesgar archivos reales.
 *
 * Secretos: FTP_HOST/USER/PASSWORD, FTP_REMOTE_PREFIX (opcional),
 * FTP_PUBLIC_BASE_URL (para reconocer los logos de marcas que sí son de Akky).
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

function prefijoRemoto(): string {
  const p = (Deno.env.get('FTP_REMOTE_PREFIX') ?? '').trim();
  return p ? `${p.replace(/^\/+|\/+$/g, '')}/` : '';
}

/** Conecta con FTPS explícito primero, cae a FTP plano si el servidor lo rechaza. */
async function conectar(): Promise<InstanceType<typeof import('npm:basic-ftp@5').Client>> {
  const host = Deno.env.get('FTP_HOST');
  const user = Deno.env.get('FTP_USER');
  const password = Deno.env.get('FTP_PASSWORD');
  if (!host || !user || !password) {
    throw new Error('Faltan credenciales FTP (FTP_HOST/USER/PASSWORD)');
  }
  const { Client } = await import('npm:basic-ftp@5');
  let client = new Client();
  try {
    await client.access({ host, user, password, secure: true });
    return client;
  } catch {
    client.close();
  }
  client = new Client();
  await client.access({ host, user, password, secure: false });
  return client;
}

/** Recorre `uploads/` recursivo y regresa las rutas relativas a esa carpeta. */
async function listarRemotos(client: Awaited<ReturnType<typeof conectar>>): Promise<string[]> {
  const raiz = `${prefijoRemoto()}uploads`;
  const rutas: string[] = [];

  async function recorrer(dir: string, relativo: string) {
    const entradas = await client.list(dir).catch(() => []);
    for (const e of entradas) {
      const rel = relativo ? `${relativo}/${e.name}` : e.name;
      if (e.isDirectory) {
        await recorrer(`${dir}/${e.name}`, rel);
      } else if (e.isFile) {
        rutas.push(rel);
      }
    }
  }

  await recorrer(raiz, '');
  return rutas;
}

/** Extrae la ruta relativa a uploads/ de un logo de marca, si es de Akky. */
function rutaDesdeUrl(url: string | null, baseUrl: string, prefijo: string): string | null {
  if (!url) return null;
  const base = `${baseUrl.replace(/\/+$/, '')}/${prefijo}uploads/`;
  return url.startsWith(base) ? url.slice(base.length) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const quienLlama = await requireAdmin(req);
    if (quienLlama.nivel_permiso === 'editor') {
      return json({ error: 'No tienes permiso para auditar archivos.' }, 403);
    }

    const admin = adminClient();
    const baseUrl = Deno.env.get('FTP_PUBLIC_BASE_URL') ?? '';
    const prefijo = prefijoRemoto();

    const [{ data: articulos }, { data: ediciones }, { data: marcas }] = await Promise.all([
      admin
        .from('articulos')
        .select('id, titulo, imagen_portada_path, imagen_portada_target'),
      admin
        .from('ediciones_revista')
        .select('id, titulo, pdf_path, pdf_target, portada_path, portada_target'),
      admin.from('marcas').select('id, nombre, logo_url'),
    ]);

    const referenciados = new Map<string, string>(); // path → de dónde viene (para el reporte)

    for (const a of articulos ?? []) {
      if (a.imagen_portada_target === 'ftp' && a.imagen_portada_path) {
        referenciados.set(a.imagen_portada_path, `artículo «${a.titulo}»`);
      }
    }
    for (const e of ediciones ?? []) {
      if (e.pdf_target === 'ftp' && e.pdf_path) {
        referenciados.set(e.pdf_path, `edición «${e.titulo}» (PDF)`);
      }
      if (e.portada_target === 'ftp' && e.portada_path) {
        referenciados.set(e.portada_path, `edición «${e.titulo}» (portada)`);
      }
    }
    for (const m of marcas ?? []) {
      const ruta = rutaDesdeUrl(m.logo_url, baseUrl, prefijo);
      if (ruta) referenciados.set(ruta, `marca «${m.nombre}» (logo)`);
    }

    const client = await conectar();
    let remotos: string[];
    try {
      remotos = await listarRemotos(client);
    } finally {
      client.close();
    }

    const remotosSet = new Set(remotos);
    const huerfanos = remotos.filter((r) => !referenciados.has(r));
    const rotos = [...referenciados.entries()]
      .filter(([path]) => !remotosSet.has(path))
      .map(([path, origen]) => ({ path, origen }));

    return json({
      ok: true,
      revisado: new Date().toISOString(),
      totalRemotos: remotos.length,
      totalReferenciados: referenciados.size,
      huerfanos, // en el FTP pero ninguna fila los referencia — candidatos a borrar a mano
      rotos, // la BD dice que deberían existir pero no están en el FTP
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
