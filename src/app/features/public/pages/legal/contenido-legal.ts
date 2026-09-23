export interface SeccionLegal {
  titulo: string;
  parrafos: string[];
}

export interface DocumentoLegal {
  eyebrow: string;
  titulo: string;
  intro: string;
  secciones: SeccionLegal[];
}

/**
 * TODO (issues #8 y #70): TODO el texto de este archivo es lorem ipsum de
 * relleno, pendiente de que la clienta entregue el contenido real. Los
 * títulos de sección son la estructura típica de cada documento y también
 * se pueden ajustar. Al reemplazar el contenido no hace falta tocar nada más.
 */
const LOREM_A =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
const LOREM_B =
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const LOREM_C =
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.';

const seccion = (titulo: string): SeccionLegal => ({
  titulo,
  parrafos: [LOREM_A, LOREM_B],
});

export const AVISO_PRIVACIDAD: DocumentoLegal = {
  eyebrow: 'Legal',
  titulo: 'Aviso de Privacidad',
  intro: LOREM_C,
  secciones: [
    seccion('Responsable del tratamiento de tus datos'),
    seccion('Qué datos recolectamos'),
    seccion('Para qué usamos tus datos'),
    seccion('Con quién compartimos tu información'),
    seccion('Tus derechos y cómo ejercerlos'),
    seccion('Cookies y tecnologías similares'),
    seccion('Cambios a este aviso'),
    seccion('Contacto'),
  ],
};

export const TERMINOS_Y_CONDICIONES: DocumentoLegal = {
  eyebrow: 'Legal',
  titulo: 'Términos y Condiciones',
  intro: LOREM_C,
  secciones: [
    seccion('Aceptación de los términos'),
    seccion('Uso del sitio'),
    seccion('Propiedad intelectual'),
    seccion('Contenido de terceros y enlaces externos'),
    seccion('Boletín y comunicaciones'),
    seccion('Limitación de responsabilidad'),
    seccion('Modificaciones'),
    seccion('Legislación aplicable y contacto'),
  ],
};

export const DOCUMENTOS_LEGALES: Record<string, DocumentoLegal> = {
  privacidad: AVISO_PRIVACIDAD,
  terminos: TERMINOS_Y_CONDICIONES,
};
