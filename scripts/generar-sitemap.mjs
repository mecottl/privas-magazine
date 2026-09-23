// Genera sitemap.xml en el build (CI): páginas fijas + artículos y ediciones
// publicados (issue #84). Usa la anon key pública, igual que el sitio: RLS ya
// filtra a lo publicado. Si Supabase falla, deja solo las páginas fijas.
import { writeFileSync } from 'node:fs';

const SITE = 'https://privasmagazine.com';
const API = 'https://xiqqhjdpmqdnzsvpjhwq.supabase.co/rest/v1';
const key = process.env.SUPABASE_ANON_KEY;
const out = process.argv[2] ?? 'dist/privas-magazine/browser/sitemap.xml';

const urls = ['/', '/articulos', '/revistas', '/marcas', '/directorio-y-sobre-nosotros',
  '/aviso-de-privacidad', '/terminos-y-condiciones'].map((p) => ({ loc: p }));

try {
  const r = await fetch(
    `${API}/articulos?select=slug,fecha_publicacion&estado=eq.publicado&eliminado_en=is.null`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  for (const a of await r.json()) {
    urls.push({ loc: `/articulos/${encodeURIComponent(a.slug)}`, lastmod: a.fecha_publicacion?.slice(0, 10) });
  }
} catch (e) {
  console.warn('sitemap: sin artículos,', e.message);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
writeFileSync(out, xml);
console.log(`sitemap: ${urls.length} URLs`);
