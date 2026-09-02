/**
 * subir-archivo (CLAUDE.md § 2 · brief "lógica real")
 *
 *   Panel Angular → esta función → (Supabase Storage | SFTP Hostinger) → URL
 *
 * Quién la llama: un admin logueado, desde el panel (portada de artículo, o
 * PDF + portada de revista).
 *
 * 1. requireAdmin (admin activo).
 * 2. multipart/form-data: `archivo` + `tipo`
 *    ('articulo-portada' | 'revista-pdf' | 'revista-portada').
 * 3. Valida tamaño según el tipo ANTES de intentar subir.
 * 4. Nombre seguro y único: <slug>-<timestamp>.<ext> (nunca el nombre original).
 * 5. Según UPLOAD_TARGET:
 *      - 'supabase' → bucket privado, devuelve URL firmada de larga expiración.
 *      - 'sftp'     → SFTP a public_html/uploads/<...>, devuelve URL pública.
 * 6. 200 { url } — el frontend guarda esa URL en la fila correspondiente.
 *
 * Secretos: SFTP_HOST / SFTP_USER / SFTP_PASSWORD, UPLOAD_TARGET,
 *           SFTP_PUBLIC_BASE_URL (ej. https://privasmagazine.com),
 *           UPLOAD_BUCKET (default "uploads").
 */
import { Buffer } from 'node:buffer';
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, requireAdmin } from '../_shared/clients.ts';

type TipoArchivo = 'articulo-portada' | 'revista-pdf' | 'revista-portada';

interface ReglaTipo {
  /** Tamaño máximo en bytes. */
  maxBytes: number;
  /** MIME types aceptados. */
  mimes: string[];
  /** Subcarpeta dentro del destino. */
  carpeta: string;
}

const MB = 1024 * 1024;
const REGLAS: Record<TipoArchivo, ReglaTipo> = {
  'articulo-portada': {
    maxBytes: 8 * MB,
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    carpeta: 'articulos',
  },
  'revista-portada': {
    maxBytes: 8 * MB,
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    carpeta: 'revistas',
  },
  'revista-pdf': {
    maxBytes: 60 * MB,
    mimes: ['application/pdf'],
    carpeta: 'revistas',
  },
};

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
};

function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'archivo';
}

async function subirASupabase(
  ruta: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const bucket = Deno.env.get('UPLOAD_BUCKET') ?? 'uploads';
  const supabase = adminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(ruta, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Storage: ${error.message}`);

  // Bucket privado → URL firmada de larga expiración (1 año).
  const { data, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(ruta, 60 * 60 * 24 * 365);
  if (signErr || !data) throw new Error(`Storage signedUrl: ${signErr?.message}`);
  return data.signedUrl;
}

async function subirPorSftp(ruta: string, bytes: Uint8Array): Promise<string> {
  const host = Deno.env.get('SFTP_HOST');
  const user = Deno.env.get('SFTP_USER');
  const password = Deno.env.get('SFTP_PASSWORD');
  const baseUrl = Deno.env.get('SFTP_PUBLIC_BASE_URL');
  if (!host || !user || !password || !baseUrl) {
    throw new Error('Faltan credenciales SFTP (SFTP_HOST/USER/PASSWORD/PUBLIC_BASE_URL)');
  }

  // Import dinámico: solo se carga si realmente se usa la rama SFTP.
  const { default: SftpClient } = await import('npm:ssh2-sftp-client@11');
  const sftp = new SftpClient();
  const remotePath = `public_html/uploads/${ruta}`;
  try {
    await sftp.connect({ host, username: user, password });
    const dir = remotePath.slice(0, remotePath.lastIndexOf('/'));
    if (!(await sftp.exists(dir))) await sftp.mkdir(dir, true);
    // ssh2-sftp-client acepta Buffer; Uint8Array funciona vía Buffer.from.
    await sftp.put(Buffer.from(bytes), remotePath);
  } finally {
    await sftp.end().catch(() => {});
  }
  return `${baseUrl.replace(/\/$/, '')}/uploads/${ruta}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    await requireAdmin(req);

    const form = await req.formData();
    const archivo = form.get('archivo');
    const tipo = String(form.get('tipo') ?? '') as TipoArchivo;

    if (!(archivo instanceof File)) return json({ error: 'Falta "archivo"' }, 400);
    const regla = REGLAS[tipo];
    if (!regla) {
      return json(
        { error: `"tipo" inválido. Usa: ${Object.keys(REGLAS).join(', ')}` },
        400,
      );
    }

    const contentType = archivo.type || 'application/octet-stream';
    if (!regla.mimes.includes(contentType)) {
      return json(
        { error: `Formato no permitido para ${tipo}: ${contentType}` },
        415,
      );
    }
    if (archivo.size > regla.maxBytes) {
      return json(
        {
          error: `El archivo pesa ${(archivo.size / MB).toFixed(1)} MB; el máximo para ${tipo} es ${regla.maxBytes / MB} MB`,
        },
        413,
      );
    }

    const ext =
      EXT_POR_MIME[contentType] ??
      (archivo.name.includes('.') ? archivo.name.split('.').pop()! : 'bin');
    const base = slugify(archivo.name.replace(/\.[^.]+$/, ''));
    const nombre = `${base}-${Date.now()}.${ext}`;
    const ruta = `${regla.carpeta}/${nombre}`;

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const target = Deno.env.get('UPLOAD_TARGET') ?? 'supabase';

    let url: string;
    if (target === 'sftp') {
      url = await subirPorSftp(ruta, bytes);
    } else {
      url = await subirASupabase(ruta, bytes, contentType);
    }

    return json({ ok: true, url, ruta, tipo, target });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
