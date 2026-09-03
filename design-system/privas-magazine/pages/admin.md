# Admin Page Overrides

> **PROJECT:** PRIVAS Magazine
> **Generated:** 2026-09-03 14:44:43
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- No overrides — use Master colors

### Component Overrides

- Avoid: Use arbitrary large z-index values
- Avoid: Overflow or broken layout
- Avoid: Lorem ipsum everywhere

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Purposeful admin feedback and restrained transitions
- Layout: Define z-index scale system (10 20 30 50)
- Content: Truncate with ellipsis and expand option
- Content: Use realistic sample data

## Overrides del proyecto (prioridad sobre lo generado)

- **Panel CLARO**, no oscuro. Es el CMS de una revista editorial, no un dashboard de telemetría — hereda los tokens del sitio público (`styles.scss`): acento teal `#1F5B67`, neutros editoriales, Libre Franklin en toda la UI (Libre Caslon Text solo en el h1 de cada pantalla).
- Ignorar la paleta oscura + verde y las fuentes Fira del catálogo, y el patrón "Real-Time / Operations Landing" (es para una landing de producto, no aplica).
- Densidad alta (8/10): padding de tabla y formularios compacto, ritmo vertical corto.
- Sin GSAP; micro-transiciones CSS 150-250ms.
- Badges de estado (borrador/programado/publicado/despublicado) = color + texto, nunca color solo.

---

## Overrides del proyecto — app-shell (2026-09-03)

- **Shell fijo**: `app-admin-layout` = `height: 100dvh; overflow: hidden`. Solo
  el área de contenido hace scroll. La sidebar nunca genera scroll de página.
- **Estructura estándar de cada página**: `.admin-page` (flex column, 100%) con
  `.admin-page-head` (fijo) + `.admin-page__scroll` (scroll interno) o
  `.admin-page__fill` (para listas: la `.tabla-wrap` ocupa el resto y hace
  scroll interno; la página no crece).
- **Editor de artículo**: `.editor-body` no scrollea; el panel izquierdo
  (`.editor-contenido-scroll`) y el derecho (`.editor-lado`) scrollean por
  separado dentro del alto de pantalla.
- **Modales**: `ConfirmService` + `<app-confirm-dialog>` (montado una vez en el
  shell) para todo borrado / activar-desactivar. El editor mantiene su propio
  `<dialog>` para publicar/programar/despublicar (necesita el campo de fecha).
- **Sin texto explicativo para el cliente**: nada de "slug: —", conteos,
  menciones a Edge Functions, "por defecto tu cuenta", etc. Solo labels de UI.
- Acciones de fila = botón "Editar" + `<select>` "Acciones…" (publicar,
  despublicar, borrador, eliminar). Columna `.col-acciones` con `width: 1%`.
