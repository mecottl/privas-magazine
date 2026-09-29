/**
 * Estos 4 paquetes de Editor.js sí traen un `dist/index.d.ts`, pero su
 * `package.json` tiene un bloque `exports` sin condición `types` — con
 * `exports` presente, TS ignora el campo legado `types` de nivel superior y
 * no encuentra la declaración (bug de empaquetado de esos paquetes, no
 * nuestro). El resto de las herramientas de Editor.js instaladas aquí sí
 * resuelven sus tipos solas.
 */
declare module '@editorjs/checklist';
declare module '@editorjs/embed';
declare module '@editorjs/link';
declare module '@editorjs/marker';
