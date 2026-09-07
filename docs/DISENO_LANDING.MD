# PRIVAS Magazine — diseño del landing

Tokens reales sacados de `src/styles.scss`. No son propuestas, es lo que
ya está implementado. Referencia de moodboard: Yucatán Today / RSVP (ver
issue #6).

> Dirección de diseño (comentario original del CSS): *"Revista de viajes
> cálida. Teal profundo como superficie dominante, marfil para las
> tarjetas, fotografía a sangre, esquinas muy redondeadas, tipografía de
> revista (Fraunces) y movimiento con intención."*

## Color

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#256585` | Teal de marca — paneles, botones |
| `--brand-hi` | `#357e9e` | Teal claro — degradados, hover |
| `--brand-lo` | `#1c4a60` | Teal profundo — presionado, sombras |
| `--brand-ink` | `#143848` | Casi navy — bloques oscuros |
| `--navy` | `#0e2c3a` | El más oscuro — "próximamente" |
| `--cream` | `#f7f2e7` | Tarjetas sobre teal |
| `--paper` | `#edeae1` | Fondo de página tras los paneles |
| `--white` | `#ffffff` | — |
| `--ink` | `#16323a` | Texto principal |
| `--ink-55` | `#5b747b` | Texto secundario |
| `--danger` | `#a33124` | Errores |
| `--exito` | `#1f6b4f` | Confirmaciones |

Estados (badges de artículo/revista): `--estado-borrador` `#6a6660` ·
`--estado-programado` `#8a5a12` · `--estado-publicado` `#256585` ·
`--estado-despublicado` `#9a958c`

## Tipografía

- **Display / títulos** — `'Fraunces', 'Libre Bodoni', Georgia, serif`
- **Wordmark + admin** — `'Libre Bodoni', Georgia, serif`
- **Texto general** — `'Hanken Grotesk', system-ui, -apple-system,
  'Segoe UI', Roboto, sans-serif`

| Token | Valor |
|---|---|
| `--fs-3xs` → `--fs-lg` | 11px → 22px (pasos fijos) |
| `--fs-h3` | `clamp(1.35rem, 1.1rem + 1vw, 1.8rem)` |
| `--fs-h2` | `clamp(1.9rem, 1.3rem + 2.6vw, 3rem)` |
| `--fs-h1` | `clamp(2.2rem, 1.5rem + 3.4vw, 3.9rem)` |
| `--fs-display` | `clamp(2.6rem, 1.5rem + 5.6vw, 5.4rem)` |

`--tracking-caps: 0.18em` · `--leading-tight: 1.08` (títulos) ·
`--leading-body: 1.62` (párrafos)

## Espaciado

`--space-3xs` a `--space-3xl`: `4 · 8 · 12 · 16 · 24 · 36 · 56 · 88 ·
128px`

## Layout

| Token | Valor |
|---|---|
| `--ancho-max` | `1240px` |
| `--ancho-texto` | `66ch` |
| `--ancho-lectura` | `42rem` |
| `--head-h` | `86px` |

## Radios y sombras

`--r-card: 20px` · `--r-lg: 28px` · `--r-panel: clamp(24px, 4vw, 48px)` ·
`--r-pill: 999px`

`--sombra-1/2/3` (intensidad creciente) · `--shadow-card` ·
`--shadow-lift` (hover elevado) · `--shadow-head`

## Liquid glass

```
--glass-blur: blur(8px) saturate(1.8) brightness(1.12) contrast(1.05)
--glass-blur-refract: blur(0.5px) url(#lg-filter) blur(1px) saturate(1.5) brightness(1.1)
--glass-edge:
  inset 0 0 0 1px rgba(255, 255, 255, 0.15),
  inset 1.5px 1.5px 0 rgba(255, 255, 255, 0.5),
  inset 0 0 12px rgba(255, 255, 255, 0.2)
--glass-drop: 0 8px 32px rgba(9, 28, 38, 0.28)
```

`--glass-edge` funciona bien en elementos tipo tarjeta. En barras a todo
el ancho (ej. header) el inset claro dibuja un marco blanco no deseado —
en esos casos usar `border-bottom: 1px solid rgba(255,255,255,0.1)` +
`box-shadow` propia en su lugar.

## Movimiento

`--t: 200ms cubic-bezier(0.22, 1, 0.36, 1)` (estándar) · `--t-slow: 520ms
cubic-bezier(0.16, 1, 0.3, 1)` (transiciones grandes). Todo respeta
`prefers-reduced-motion: reduce`.

## Breakpoints en uso

`560px` · `620px` · `880px` · `900px` (principal, mobile-first) ·
`901px` (desktop)

## Patrones de referencia

Los patrones de sección compartidos viven en `src/styles/_secciones.scss`
y los usan tanto la portada como la página de categorías.

**Hero a sangre** (`.hero`): foto de fondo (`.hero__media`), degradado de
legibilidad (`.hero::after`), contenido centrado (`.hero__inner` con
`.hero__eyebrow` / `.hero__title` / `.hero__texto`). Modificadores:
- `.hero--full` → `min-height: 100dvh` (portada; título mayor).
- `.hero--seccion` → `min-height: clamp(24rem, 62vh, 34rem)` (cabecera de
  categoría).

Indicador de scroll: `.hero__cue` (link al primer bloque de contenido,
`aria-label`, ícono animado que se desactiva en `prefers-reduced-motion`).

**Franja teal** (`.franja`): panel `--brand` con esquinas `--r-panel` que
"monta" sobre la sección previa con `margin-top` negativo. `.hero + .franja`
y `.franja + .franja` anulan ese margen y el redondeo. `.franja--foto` pone
una foto de fondo (`--franja-bg`) con degradado teal encima; `.franja--fin`
añade padding inferior.

**Footer** (`app-site-footer`): grid en 4 secciones — `__brand` (logo +
tagline + `__redes-list`), columnas `.foot-col`, y `__base`/`__base-row`
(Grupo Privas + legales/privacidad + copyright).

## Organización del CSS (issue #28)

- `src/styles.scss` importa con `@use` **solo lo global** (8 partials):
  `_tokens` `_reset` `_motion` (keyframes + `.reveal`) `_primitives`
  (`.btn`, `.eyebrow`, `.meta`, `.leer`…) `_secciones` (hero + franja)
  `_paginas` (`.page`, `.inicio-encabezado`) `_skeletons` (`.sk*`)
  `_admin` (kit de UI compartido por las páginas del panel).
- **Cada componente = su carpeta con `.ts` + `.html` + `.scss`.** El `.scss`
  solo existe si el componente tiene estilos propios; si solo usa clases
  globales (p. ej. `aviso-privacidad`, las páginas de confirmación) no
  lleva `.scss`. Nada de plantillas ni estilos embebidos en el `.ts`.
- La variante compacta de `app-newsletter-form` dentro del pie vive en
  `site-footer.scss` con `::ng-deep`.
- Tarjeta de artículo reutilizable: `<app-articulo-card [articulo]>`.
- Imágenes de hero por categoría: `public/categorias/<slug>.jpg`
  (+ `archivo.jpg` para "Todas"). Hoy son copias del hero; se reemplazan
  archivo por archivo.