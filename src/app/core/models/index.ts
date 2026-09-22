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
  /**
   * Dueño real de la fila (uuid de auth.users), lo pone la BD sola
   * (`default auth.uid()`) — distinto de `autor_texto`/`autor_uid`, que son
   * el byline público y pueden decir cualquier cosa. Un `editor` solo puede
   * editar/borrar artículos donde `creado_por` sea su propio id (RLS).
   */
  creado_por?: string | null;
  /** Token de vista previa pública (issue #75) — sirve para compartir un
   *  link de borrador/programado sin sesión de admin. */
  token_preview?: string;
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

/**
 * 'dueno': poder absoluto — el único que invita/gestiona 'dueno' y
 *   'admin_total', el único que cambia el nivel de cualquier cuenta o le
 *   restablece la contraseña a otra persona, y el único que puede eliminar
 *   cuentas que no sean de nivel 'editor'.
 * 'admin_total': solo invita y gestiona (activar/desactivar/eliminar)
 *   cuentas de 'editor' — no puede tocar otras cuentas 'admin_total' ni
 *   'dueno', ni cambiar el nivel de nadie.
 * 'editor': todo el panel EXCEPTO Administradores, y solo puede
 *   editar/borrar los artículos que él mismo creó (RLS por `creado_por`).
 */
export type NivelPermiso = 'dueno' | 'admin_total' | 'editor';
export const NIVELES_PERMISO: NivelPermiso[] = ['dueno', 'admin_total', 'editor'];
export const NOMBRE_NIVEL_PERMISO: Record<NivelPermiso, string> = {
  dueno: 'Dueño',
  admin_total: 'Administrador',
  editor: 'Editor',
};

export interface PerfilAdmin {
  id: string;
  nombre_visible: string | null;
  nivel_permiso: NivelPermiso;
  activo: boolean;
  /** MFA por correo (issue #17) — opcional para admin_total/editor,
   *  obligatorio para dueño sin importar este valor (ver AuthService.mfaRequerido). */
  mfa_activo?: boolean;
  created_at?: string;
}

export interface SuscriptorNewsletter {
  id: string;
  email: string;
  activo: boolean;
  token_confirmacion: string;
  fecha_alta: string;
}

/** Registro de bitácora (issue #76) — quién hizo qué y cuándo. */
export interface BitacoraEntrada {
  id: string;
  admin_id: string | null;
  admin_nombre: string | null;
  accion: string;
  tabla: string | null;
  registro_id: string | null;
  detalle: Record<string, unknown>;
  created_at: string;
}
