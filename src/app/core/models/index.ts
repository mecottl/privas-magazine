/** Modelos de dominio — reflejan el esquema real de Supabase (ref xiqqhjdpmqdnzsvpjhwq). */

export type EstadoPublicacion =
  | 'borrador'
  | 'programado'
  | 'publicado'
  | 'despublicado';

export const ESTADOS: EstadoPublicacion[] = [
  'borrador',
  'programado',
  'publicado',
  'despublicado',
];

export type AutorTipo = 'libre' | 'usuario';

/** Destino real de una subida de archivo. */
export type DestinoArchivo = 'supabase' | 'ftp';

export type Temporada = 'primavera-verano' | 'otono-invierno';
export const TEMPORADAS: Temporada[] = ['primavera-verano', 'otono-invierno'];

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  created_at?: string;
}

/**
 * Secciones editoriales de la marca, en su orden oficial.
 * Fuente única para la navegación pública y los filtros de `/articulos`.
 */
export interface Seccion {
  slug: string;
  nombre: string;
}

export const SECCIONES: Seccion[] = [
  { slug: 'turismo', nombre: 'Turismo' },
  { slug: 'gastronomia', nombre: 'Gastronomía' },
  { slug: 'cultura', nombre: 'Cultura' },
  { slug: 'arte', nombre: 'Arte' },
  { slug: 'entretenimiento', nombre: 'Entretenimiento' },
];

/**
 * Normaliza un slug para comparar sin depender de acentos ni mayúsculas.
 * En la BD hay slugs con diacríticos (p. ej. "gastronomía"); la navegación y
 * los filtros usan la forma ASCII. Comparar normalizado evita el desajuste.
 */
export function normalizarSlug(slug: string | null | undefined): string {
  return (slug ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** `true` si dos slugs designan la misma sección (ignorando acentos/caso). */
/** Igual que `normalizarSlug`, con nombre propio para comparar texto libre
 *  (búsqueda de artículos): quita acentos, baja a minúsculas y recorta. */
export const normalizarTexto = normalizarSlug;

export function mismoSlug(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizarSlug(a) === normalizarSlug(b);
}

/**
 * Índice de una categoría en el orden editorial (por slug).
 * Las categorías que no forman parte de las secciones oficiales van al final.
 */
export function ordenSeccion(slug: string): number {
  const objetivo = normalizarSlug(slug);
  const i = SECCIONES.findIndex((s) => normalizarSlug(s.slug) === objetivo);
  return i === -1 ? SECCIONES.length : i;
}

/** Categoría embebida en un artículo (join M2M `articulos_categorias`). */
export type CategoriaRef = Pick<Categoria, 'id' | 'nombre' | 'slug'>;

/**
 * Un bloque de contenido de artículo.
 *
 * Es un elemento del array `blocks` de Editor.js, guardado tal cual en
 * `articulos.contenido_json` (SIN el wrapper `time` / `version`).
 * `type`: 'paragraph' | 'header' | 'quote' | 'list' | 'image' (y los que se
 * agreguen). `data`: la forma varía por herramienta:
 *   - paragraph: { text }
 *   - header:    { text, level }
 *   - quote:     { text, caption, alignment }
 *   - list:      { style: 'ordered'|'unordered', items: string[] }
 *   - image:     { file: { url }, caption, withBorder, stretched, withBackground }
 */
export interface BloqueContenido {
  id?: string;
  type: string;
  data: Record<string, unknown>;
}

export interface Articulo {
  id: string;
  titulo: string;
  slug: string;
  extracto: string | null;
  contenido_json: BloqueContenido[];
  imagen_portada_url: string | null;
  estado: EstadoPublicacion;
  autor_tipo: AutorTipo;
  autor_texto: string | null;
  autor_uid: string | null;
  /** Ruta interna y destino de la portada — para borrarla si se reemplaza/elimina. */
  imagen_portada_path?: string | null;
  imagen_portada_target?: DestinoArchivo | null;
  fecha_publicacion: string | null;
  created_at?: string;
  updated_at?: string;
  /** Categorías del artículo (join M2M). Un artículo puede tener varias. */
  categorias?: CategoriaRef[];
}

export interface EdicionRevista {
  id: string;
  titulo: string;
  temporada: Temporada;
  anio: number;
  /** NOT NULL en la BD. */
  pdf_url: string;
  /** NOT NULL en la BD. */
  portada_url: string;
  /** Rutas internas y destinos — para borrar los archivos al reemplazar/eliminar. */
  pdf_path?: string | null;
  portada_path?: string | null;
  pdf_target?: DestinoArchivo | null;
  portada_target?: DestinoArchivo | null;
  estado: EstadoPublicacion;
  fecha_publicacion: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Tipos de red social conocidos para `EnlaceMarca.tipo` (texto libre en la BD). */
export type TipoEnlace =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'x'
  | 'linkedin'
  | 'whatsapp'
  | 'otro';

export const TIPOS_ENLACE: TipoEnlace[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'x',
  'linkedin',
  'whatsapp',
  'otro',
];

/** Un enlace de red social dentro de `Marca.enlaces`. */
export interface EnlaceMarca {
  tipo: TipoEnlace | string;
  url: string;
}

export interface Marca {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Link principal al sitio propio de la marca (CTA destacado). */
  sitio_web_url: string | null;
  /** Lista flexible de redes sociales. */
  enlaces: EnlaceMarca[];
  /** @deprecated conservada por compatibilidad; usar `enlaces`. */
  red_social_url: string | null;
  logo_url: string | null;
  orden: number;
  created_at?: string;
}

export type NivelPermiso = 'admin_total';
export const NIVELES_PERMISO: NivelPermiso[] = ['admin_total'];

export interface PerfilAdmin {
  id: string;
  nombre_visible: string | null;
  nivel_permiso: NivelPermiso;
  activo: boolean;
  created_at?: string;
}

export interface SuscriptorNewsletter {
  id: string;
  email: string;
  activo: boolean;
  token_confirmacion: string;
  fecha_alta: string;
}
