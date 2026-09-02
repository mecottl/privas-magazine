/**
 * subir-archivo (CLAUDE.md § 2)
 *
 *   Panel Angular → esta función → SFTP → Hostinger (public_html/uploads)
 *
 * Recibe un archivo del panel, lo sube al destino configurado y devuelve la
 * URL pública final (para guardar en imagen_portada_url / pdf_url / portada_url).
 *
 * Destino CONFIGURABLE, no hardcodeado:
 *   - UPLOAD_TARGET=sftp      → Hostinger vía SFTP (SFTP_HOST/USER/PASSWORD)
 *   - UPLOAD_TARGET=supabase  → bucket privado de Storage (staging, sin Hostinger)
 *
 * Credenciales SFTP = secretos de esta función. NUNCA en el frontend.
 */
import { corsHeaders, json } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    await requireAdmin(req);

    const form = await req.formData();
    const file = form.get('archivo');
    if (!(file instanceof File)) return json({ error: 'Falta "archivo"' }, 400);

    const target = Deno.env.get('UPLOAD_TARGET') ?? 'supabase';

    // TODO: implementar
    //  - target === 'sftp'     → subir por SFTP a Hostinger, componer URL pública
    //  - target === 'supabase' → subir al bucket privado, devolver signed/public URL
    return json({ error: `TODO: subida a "${target}" no implementada` }, 501);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: String(e) }, 500);
  }
});
