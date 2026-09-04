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
export type DestinoArchivo = 'supabase' | 'sftp';

export type Temporada = 'primavera-verano' | 'otono-invierno';
export const TEMPORADAS: Temporada[] = ['primavera-verano', 'otono-invierno'];

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  created_at?: string;
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

export interface Marca {
  id: string;
  nombre: string;
  red_social_url: string;
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
