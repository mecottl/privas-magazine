/** Modelos de dominio (mapeo amigable sobre database.types.ts). */

export type EstadoPublicacion =
  | 'borrador'
  | 'programado'
  | 'publicado'
  | 'despublicado';

export type AutorTipo = 'libre' | 'usuario';

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
}

export interface Articulo {
  id: string;
  titulo: string;
  slug: string;
  extracto: string | null;
  contenido_json: unknown;
  imagen_portada_url: string | null;
  categoria_id: string | null;
  estado: EstadoPublicacion;
  autor_tipo: AutorTipo;
  autor_texto: string | null;
  autor_uid: string | null;
  fecha_publicacion: string | null;
  created_at: string;
  updated_at: string;
}

export interface EdicionRevista {
  id: string;
  titulo: string;
  portada_url: string | null;
  pdf_url: string | null;
  estado: EstadoPublicacion;
  fecha_publicacion: string | null;
}

export interface Marca {
  id: string;
  nombre: string;
  descripcion: string | null;
  url_red_social: string | null;
  logo_url: string | null;
}

export type NivelPermiso = 'admin_total';

export interface PerfilAdmin {
  id: string;
  nombre_visible: string | null;
  nivel_permiso: NivelPermiso;
  activo: boolean;
}
