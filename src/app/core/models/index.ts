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

export type Temporada = 'primavera-verano' | 'otono-invierno';
export const TEMPORADAS: Temporada[] = ['primavera-verano', 'otono-invierno'];

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  created_at?: string;
}

/** Un bloque del contenido del artículo. MVP: solo tipo 'texto'. */
export interface BloqueContenido {
  tipo: string;
  contenido: string;
}

export interface Articulo {
  id: string;
  titulo: string;
  slug: string;
  extracto: string | null;
  contenido_json: BloqueContenido[];
  imagen_portada_url: string | null;
  categoria_id: string | null;
  estado: EstadoPublicacion;
  autor_tipo: AutorTipo;
  autor_texto: string | null;
  autor_uid: string | null;
  fecha_publicacion: string | null;
  created_at?: string;
  updated_at?: string;
  /** Join opcional. */
  categorias?: Pick<Categoria, 'id' | 'nombre' | 'slug'> | null;
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
