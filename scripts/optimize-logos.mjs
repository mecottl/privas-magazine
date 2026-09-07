/**
 * Recorta el fondo transparente y reescala los logos que la clienta entrega
 * (PNG enormes de Canva, ~6000px / <1 MB) a tamaños de web.
 *
 *   npm run assets:optimize
 *
 * Entrada  → design/logos/<nombre>.png   (los originales sin tocar)
 * Salida   → public/<nombre>.png        (optimizado, el que usa la app)
 */
import sharp from 'sharp';
import { statSync, writeFileSync } from 'node:fs';

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
