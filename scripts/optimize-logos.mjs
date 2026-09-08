/**
 * Optimiza los assets que entrega la clienta a tamaños de web.
 *
 *   npm run assets:optimize
 *
 * - Logos (design/logos/*.png, PNG enormes de Canva) → public/*.png recortados.
 * - Favicon → public/favicon.svg (adaptable al theme) + png + apple-touch-icon.
 * - Fotos de hero por categoría (design/categorias/*.jpg) →
 *   public/categorias/<slug>.jpg reescaladas y recomprimidas.
 */
import sharp from 'sharp';
import { statSync, writeFileSync, mkdirSync } from 'node:fs';

const JOBS = [
  // logo de "PRIVAS magazine" — header y columna de marca del pie
  { src: 'design/logos/logo-privas.png', out: 'public/logo-privas.png', height: 180 },
  // lockup "GP> Grupo Privas" — barra inferior del pie
  { src: 'design/logos/grupo-privas.png', out: 'public/grupo-privas-logo.png', height: 110 },
];

for (const { src, out, height } of JOBS) {
  await sharp(src)
    .trim({ threshold: 10 })
    .resize({ height })
    .png({ compressionLevel: 9, palette: true })
    .toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${out}  ${m.width}x${m.height}  ${(statSync(out).size / 1024).toFixed(1)} KB`);
}

/* --- Favicon: monograma "PM" -------------------------------------------------
 * El asset de la clienta es "PM" blanco sobre transparente. Generamos:
 *  - favicon.svg  → letras grandes, SIN fondo, blancas/negras según el theme
 *                   del sistema (filter:invert en prefers-color-scheme:light).
 *  - favicon.png  → respaldo para navegadores viejos (PM oscuro, transparente).
 *  - apple-touch-icon.png → icono de app iOS: PM blanco sobre teal (los iconos
 *    de home screen no admiten transparencia).
 */
{
  const PM = () => sharp('design/logos/favicon.png').trim({ threshold: 10 });

  // PM blanco pequeño (para incrustar en el SVG sin inflarlo)
  const small = await PM()
    .resize({ width: 200, fit: 'inside' })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer({ resolveWithObject: true });
  const ar = small.info.width / small.info.height; // ~1.83 (dims ya recortadas)
  const b64 = small.data.toString('base64');
  const w = 58;
  const h = Math.round(w / ar);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <style>
    .pm { filter: none }
    @media (prefers-color-scheme: light) { .pm { filter: invert(1) } }
  </style>
  <image class="pm" x="${((64 - w) / 2).toFixed(2)}" y="${((64 - h) / 2).toFixed(2)}" width="${w}" height="${h}"
    href="data:image/png;base64,${b64}"/>
</svg>
`;
  writeFileSync('public/favicon.svg', svg);
  console.log(`public/favicon.svg  ${(statSync('public/favicon.svg').size / 1024).toFixed(1)} KB`);

  // Respaldo PNG: PM oscuro sobre transparente (negate invierte el RGB, conserva alfa)
  await PM()
    .resize({ width: 90, fit: 'inside' })
    .negate({ alpha: false })
    .extend({
      top: 3, bottom: 3, left: 3, right: 3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile('public/favicon.png');
  const fp = await sharp('public/favicon.png').metadata();
  console.log(`public/favicon.png  ${fp.width}x${fp.height}  ${(statSync('public/favicon.png').size / 1024).toFixed(1)} KB`);

  // apple-touch-icon: PM blanco centrado sobre teal (los iconos de app no admiten alfa)
  const pmWhite = await PM().resize({ width: 118, fit: 'inside' }).toBuffer();
  await sharp({ create: { width: 180, height: 180, channels: 4, background: { r: 0x25, g: 0x65, b: 0x85, alpha: 1 } } })
    .composite([{ input: pmWhite, gravity: 'center' }])
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log(`public/apple-touch-icon.png  180x180  ${(statSync('public/apple-touch-icon.png').size / 1024).toFixed(1)} KB`);
}

/* --- Fotos de hero por categoría ------------------------------------------
 * design/categorias/<slug>.jpg (originales de la clienta) → public/categorias/.
 * Las que aún no tienen foto propia siguen siendo copia de hero.jpg.
 */
{
  const CATS = { turismo: 1800, gastronomia: 2000, cultura: 1800, arte: 1800, entretenimiento: 1800 };
  for (const [slug, width] of Object.entries(CATS)) {
    const src = `design/categorias/${slug}.jpg`;
    try {
      statSync(src);
    } catch {
      continue; // sin original todavía → se queda el placeholder
    }
    await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(`public/categorias/${slug}.jpg`);
    const m = await sharp(`public/categorias/${slug}.jpg`).metadata();
    console.log(`public/categorias/${slug}.jpg  ${m.width}x${m.height}  ${(statSync(`public/categorias/${slug}.jpg`).size / 1024).toFixed(0)} KB`);
  }
}

/* --- Fotos grandes: variantes responsive AVIF/WebP + LQIP -----------------
 * Para cada foto a sangre (hero de portada, fondo de Ediciones y heroes de
 * categoría) generamos:
 *   public/img/<clave>-<w>.avif  y  .webp   (varios anchos → srcset)
 *   un LQIP (placeholder borroso ~24px) en src/app/shared/lqip.generated.ts
 * El JPG original se queda como último recurso (<img src>). Lo consume el
 * componente app-hero-media.
 */
{
  mkdirSync('public/img', { recursive: true });

  // clave → archivo original. `cat-*` sale de public/categorias/.
  const FOTOS = {
    hero: 'public/hero.jpg',
    'ediciones-bg': 'public/ediciones-bg.jpg',
    'cat-archivo': 'public/categorias/archivo.jpg',
    'cat-turismo': 'public/categorias/turismo.jpg',
    'cat-gastronomia': 'public/categorias/gastronomia.jpg',
    'cat-cultura': 'public/categorias/cultura.jpg',
    'cat-arte': 'public/categorias/arte.jpg',
    'cat-entretenimiento': 'public/categorias/entretenimiento.jpg',
  };
  // `ediciones-bg` va detrás de las tarjetas y ya viene desenfocada → un solo
  // ancho basta. El resto son LCP: tres anchos.
  const ANCHOS = { 'ediciones-bg': [1400] };
  const ANCHOS_DEF = [800, 1400, 2000];

  const lqip = {};
  for (const [clave, src] of Object.entries(FOTOS)) {
    try {
      statSync(src);
    } catch {
      continue;
    }
    const anchos = ANCHOS[clave] ?? ANCHOS_DEF;
    for (const w of anchos) {
      for (const fmt of ['avif', 'webp']) {
        const out = `public/img/${clave}-${w}.${fmt}`;
        const pipe = sharp(src).resize({ width: w, withoutEnlargement: true });
        await (fmt === 'avif'
          ? pipe.avif({ quality: 50 })
          : pipe.webp({ quality: 66 })
        ).toFile(out);
        console.log(`${out}  ${(statSync(out).size / 1024).toFixed(0)} KB`);
      }
    }
    // LQIP: 24px, un pelín de desenfoque → data URI diminuto
    const tiny = await sharp(src)
      .resize({ width: 24 })
      .blur(1)
      .jpeg({ quality: 40 })
      .toBuffer();
    lqip[clave] = `data:image/jpeg;base64,${tiny.toString('base64')}`;
  }

  const ts =
    '/* Generado por scripts/optimize-logos.mjs — no editar a mano. */\n' +
    'export const LQIP: Record<string, string> = ' +
    JSON.stringify(lqip, null, 2) +
    ';\n';
  writeFileSync('src/app/shared/lqip.generated.ts', ts);
  console.log(
    `src/app/shared/lqip.generated.ts  ${Object.keys(lqip).length} claves  ${(statSync('src/app/shared/lqip.generated.ts').size / 1024).toFixed(1)} KB`,
  );
}
