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
import { statSync } from 'node:fs';

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

// favicon: "PM" blanco centrado sobre cuadrado teal redondeado (#256585,
// igual que <meta name="theme-color">), para que se vea en cualquier pestaña.
{
  const size = 512;
  const pm = await sharp('design/logos/favicon.png')
    .trim({ threshold: 10 })
    .resize({ width: 300, height: 300, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="96" ry="96"/></svg>`,
  );
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0x25, g: 0x65, b: 0x85, alpha: 1 } } })
    .composite([{ input: pm, gravity: 'center' }, { input: mask, blend: 'dest-in' }])
    .png()
    .toFile('public/favicon-512.png');
  const m = await sharp('public/favicon-512.png').metadata();
  console.log(`public/favicon-512.png  ${m.width}x${m.height}  ${(statSync('public/favicon-512.png').size / 1024).toFixed(1)} KB`);
}
