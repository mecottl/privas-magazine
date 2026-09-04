/**
 * subir-archivo (CLAUDE.md § 2 · brief "lógica real")
 *
 *   Panel Angular → esta función → (Supabase Storage | FTP Akky) → URL
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
 *      - 'ftp'      → FTP (cPanel de Akky) a public_html/uploads/<...>,
 *                     devuelve URL pública. Akky confirmó que NO tiene SFTP,
 *                     solo FTP plano (sin cifrar) vía cPanel — ver nota de
 *                     seguridad en `subirPorFtp` más abajo.
 * 6. 200 { url } — el frontend guarda esa URL en la fila correspondiente.
 *
 * Secretos: FTP_HOST / FTP_USER / FTP_PASSWORD, UPLOAD_TARGET,
 *           FTP_PUBLIC_BASE_URL (ej. https://privasmagazine.com),
 *           UPLOAD_BUCKET (default "uploads").
 *
 * Historial: antes usaba SFTP real (ssh2-sftp-client) pensando en Hostinger.
 * Se migró a FTP plano (basic-ftp) el 4 sep 2026 porque Akky confirmó que no
 * ofrece SFTP. Si Akky llega a habilitar SFTP/FTPS más adelante, vale la pena
 * volver a esta función para cifrar la subida.
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
    // Tope absoluto (rama FTP). Con UPLOAD_TARGET=supabase se recorta a 45 MB
    // porque Supabase Storage tiene un límite real de ~50 MB por archivo.
    maxBytes: 60 * MB,
    mimes: ['application/pdf'],
    carpeta: 'revistas',
  },
};

/** Límite de PDF de revista cuando el destino es Supabase Storage. */
const REVISTA_PDF_MAX_SUPABASE = 45 * MB;

/** Tamaño máximo efectivo según el tipo y el destino de subida. */
function maxBytesPara(tipo: TipoArchivo, target: string): number {
  if (tipo === 'revista-pdf' && target !== 'ftp') {
    return REVISTA_PDF_MAX_SUPABASE;
  }
  return REGLAS[tipo].maxBytes;
}

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

async function subirPorFtp(ruta: string, bytes: Uint8Array): Promise<string> {
  const host = Deno.env.get('FTP_HOST');
  const user = Deno.env.get('FTP_USER');
  const password = Deno.env.get('FTP_PASSWORD');
  const baseUrl = Deno.env.get('FTP_PUBLIC_BASE_URL');
  if (!host || !user || !password || !baseUrl) {
    throw new Error('Faltan credenciales FTP (FTP_HOST/USER/PASSWORD/PUBLIC_BASE_URL)');
  }

  // Import dinámico: solo se carga si realmente se usa la rama FTP.
  // basic-ftp es puro JS (sin bindings nativos), a diferencia de ssh2.
  const { Client } = await import('npm:basic-ftp@5');
  const { Readable } = await import('node:stream');

  const remoteDir = `public_html/uploads/${ruta.slice(0, ruta.lastIndexOf('/'))}`;
  const remoteName = ruta.slice(ruta.lastIndexOf('/') + 1);

  // Akky confirmó que NO tiene SFTP — solo FTP plano vía cPanel. Intentamos
  // primero FTPS explícito (mismo puerto 21, cifra la sesión SI el servidor
  // lo soporta) y, solo si esa conexión falla, abrimos una segunda conexión
  // en FTP sin cifrar. Dos clientes distintos a propósito: un `Client` de
  // basic-ftp no se puede "reintentar" limpiamente tras un access() fallido.
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
    if (!conectado) {
      await client.access({ host, user, password, secure: false });
    }
    await client.ensureDir(remoteDir);
    await client.uploadFrom(Readable.from(bytes), remoteName);
  } finally {
    client.close();
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

    const target = Deno.env.get('UPLOAD_TARGET') ?? 'supabase';
    const maxBytes = maxBytesPara(tipo, target);
    if (archivo.size > maxBytes) {
      return json(
        {
          error: `El archivo pesa ${(archivo.size / MB).toFixed(1)} MB; el máximo para ${tipo} (destino ${target}) es ${maxBytes / MB} MB`,
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

    let url: string;
    if (target === 'ftp') {
      url = await subirPorFtp(ruta, bytes);
    } else {
      url = await subirASupabase(ruta, bytes, contentType);
    }

    return json({ ok: true, url, ruta, tipo, target });
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
