export interface SeccionLegal {
  titulo: string;
  parrafos: string[];
}

export interface DocumentoLegal {
  eyebrow: string;
  titulo: string;
  intro: string;
  secciones: SeccionLegal[];
  /** Texto tal cual, ej. "01 de octubre de 2026". */
  ultimaActualizacion: string;
}

/**
 * Texto real entregado por la clienta (issues #8 y #70), tomado de los PDF
 * "AVISO DE PRIVACIDAD MAGAZINE" y "TÉRMINOS Y CONDICIONES MAGAZINE".
 * Si vuelve a cambiar, se actualiza aquí — no hace falta tocar nada más.
 *
 * Los párrafos se pintan con [innerHTML] (ver pagina-legal.html), así que
 * aquí sí pueden llevar <b>, <a href="mailto:…"> y <a href="tel:…">. Son
 * strings fijos escritos a mano, no algo que meta un usuario — no hay riesgo
 * de que esto reciba HTML de fuera.
 */
const AVISO_PRIVACIDAD: DocumentoLegal = {
  eyebrow: 'Legal',
  titulo: 'Aviso de Privacidad',
  intro:
    '<b>Privas Magazine</b> es responsable del tratamiento y protección de los datos personales que sean proporcionados a través de este sitio web.',
  ultimaActualizacion: '01 de octubre de 2026',
  secciones: [
    {
      titulo: 'Datos personales que recopilamos',
      parrafos: [
        'A través del formulario de suscripción al boletín de <b>Privas Magazine</b>, únicamente podremos recopilar la dirección de correo electrónico que el usuario proporcione voluntariamente.',
      ],
    },
    {
      titulo: 'Finalidad del uso de los datos',
      parrafos: [
        'El correo electrónico será utilizado exclusivamente para enviar el boletín y las novedades de <b>Privas Magazine</b>, e informar sobre nuevos contenidos, publicaciones y actividades relacionadas con la revista.',
        'No utilizaremos los datos personales para fines distintos a los señalados en este aviso.',
      ],
    },
    {
      titulo: 'Protección de los datos',
      parrafos: [
        '<b>Privas Magazine</b> implementará las medidas necesarias para proteger los datos personales proporcionados y evitar su pérdida, uso, acceso o divulgación no autorizados.',
      ],
    },
    {
      titulo: 'Derechos ARCO',
      parrafos: [
        'El titular de los datos personales tiene derecho a Acceder a sus datos personales, Rectificarlos cuando sean incorrectos o estén desactualizados, solicitar su Cancelación cuando legalmente corresponda, así como Oponerse a su uso para determinados fines.',
        'Para ejercer cualquiera de estos derechos, podrá enviar una solicitud al correo electrónico <a href="mailto:contacto@privasmagazine.com">contacto@privasmagazine.com</a>, indicando su nombre, el derecho que desea ejercer y los datos relacionados con su solicitud.',
      ],
    },
    {
      titulo: 'Retiro de consentimiento',
      parrafos: [
        'El usuario podrá solicitar en cualquier momento dejar de recibir el boletín de <b>Privas Magazine</b> y retirar su consentimiento para el uso de su correo electrónico con dicha finalidad, mediante una solicitud al correo de contacto publicado en esta misma página, o utilizando el enlace de cancelación incluido en los correos del boletín, cuando éste se encuentre disponible.',
      ],
    },
    {
      titulo: 'Cambios al Aviso de Privacidad',
      parrafos: [
        '<b>Privas Magazine</b> podrá modificar o actualizar este Aviso de Privacidad cuando sea necesario. Cualquier cambio será publicado en esta misma página.',
      ],
    },
    {
      titulo: 'Atención al público',
      parrafos: [
        'Ubicada en Mérida, Yucatán. Tel.: <a href="tel:+525291067711">0152 (999) 106-7711</a>.',
      ],
    },
  ],
};

const TERMINOS_Y_CONDICIONES: DocumentoLegal = {
  eyebrow: 'Legal',
  titulo: 'Términos y Condiciones',
  intro:
    'El acceso y uso de este sitio web implica la aceptación de los presentes Términos y Condiciones. Si no está de acuerdo con alguno de ellos, le recomendamos abstenerse de utilizar el sitio.',
  ultimaActualizacion: '01 de octubre de 2026',
  secciones: [
    {
      titulo: 'Uso del sitio',
      parrafos: [
        'El sitio web de <b>Privas Magazine</b> tiene como finalidad ofrecer contenido editorial relacionado con turismo, gastronomía, arte, cultura y entretenimiento, así como información y contenidos de interés para sus lectores.',
        'El usuario se compromete a utilizar el sitio de manera lícita y respetuosa, y a no realizar actividades que puedan dañar, interferir o afectar el funcionamiento del sitio o sus contenidos.',
      ],
    },
    {
      titulo: 'Propiedad intelectual',
      parrafos: [
        'Todos los contenidos publicados en <b>Privas Magazine</b>, incluyendo artículos, textos, fotografías, imágenes, videos, logotipos, diseños, gráficos y demás materiales, se encuentran protegidos por las disposiciones aplicables en materia de propiedad intelectual.',
        'Salvo que se indique expresamente lo contrario, dichos contenidos no podrán ser copiados, reproducidos, modificados, distribuidos, publicados o utilizados con fines comerciales sin la autorización previa y por escrito de sus respectivos titulares.',
        'El usuario podrá compartir enlaces a los contenidos publicados en el sitio, siempre que se reconozca claramente a <b>Privas Magazine</b> como fuente y no se altere el contenido.',
      ],
    },
    {
      titulo: 'Contenido de colaboradores',
      parrafos: [
        'Los artículos, fotografías, videos y demás materiales enviados por colaboradores o terceros serán publicados bajo la responsabilidad de sus respectivos autores.',
        'Los colaboradores deberán garantizar que cuentan con los derechos o autorizaciones necesarias para utilizar y proporcionar los materiales que envíen a <b>Privas Magazine</b> y que éstos no infringen derechos de terceros.',
        'La publicación de un contenido no implica necesariamente que <b>Privas Magazine</b> comparta todas las opiniones expresadas por su autor.',
      ],
    },
    {
      titulo: 'Exactitud de la información',
      parrafos: [
        '<b>Privas Magazine</b> procura que la información publicada sea clara y actualizada; sin embargo, algunos contenidos pueden estar sujetos a cambios, particularmente aquellos relacionados con establecimientos, destinos, horarios, precios, servicios, eventos o actividades de terceros.',
        'Por ello, se recomienda al usuario verificar directamente con el proveedor correspondiente la información que pueda haber cambiado.',
      ],
    },
    {
      titulo: 'Enlaces a sitios externos',
      parrafos: [
        'El sitio puede contener enlaces a páginas web de terceros. <b>Privas Magazine</b> no controla dichos sitios ni es responsable de sus contenidos, políticas, productos, servicios o prácticas de privacidad.',
      ],
    },
    {
      titulo: 'Publicidad y contenido patrocinado',
      parrafos: [
        '<b>Privas Magazine</b> podrá publicar en su sitio web y en sus ediciones digitales o impresas espacios publicitarios, promociones, contenidos patrocinados o colaboraciones comerciales de empresas, marcas, establecimientos, destinos turísticos y otros terceros.',
        'Los contenidos que tengan carácter publicitario o sean resultado de un acuerdo comercial podrán identificarse como "Publicidad", "Contenido patrocinado", "Patrocinado" o mediante una denominación equivalente, con el propósito de diferenciarlos del contenido editorial.',
        'La publicación de publicidad o contenido patrocinado no implica necesariamente que <b>Privas Magazine</b> respalde, garantice o recomiende los productos o servicios anunciados. Los anunciantes serán responsables de la información, promociones, precios, características y demás afirmaciones relacionadas con sus productos o servicios.',
        '<b>Privas Magazine</b> podrá establecer criterios editoriales y comerciales para aceptar, rechazar o retirar publicidad o contenido patrocinado que no sea compatible con las características, objetivos o lineamientos de la publicación.',
      ],
    },
    {
      titulo: 'Suscripción al boletín',
      parrafos: [
        'El usuario podrá proporcionar voluntariamente su correo electrónico para recibir el boletín de <b>Privas Magazine</b>.',
        'La suscripción implica la aceptación del tratamiento del correo electrónico para dicha finalidad, de conformidad con nuestro Aviso de Privacidad. El usuario podrá solicitar la cancelación de su suscripción en cualquier momento.',
      ],
    },
    {
      titulo: 'Modificaciones',
      parrafos: [
        '<b>Privas Magazine</b> podrá modificar, actualizar o retirar contenidos del sitio, así como modificar los presentes Términos y Condiciones cuando resulte necesario.',
        'Las modificaciones serán publicadas en esta misma página y entrarán en vigor a partir de su publicación.',
      ],
    },
    {
      titulo: 'Legislación aplicable',
      parrafos: [
        'Estos Términos y Condiciones se regirán por las leyes aplicables en los Estados Unidos Mexicanos. Cualquier controversia relacionada con el uso del sitio será atendida conforme a la legislación mexicana y ante las autoridades competentes que correspondan.',
      ],
    },
    {
      titulo: 'Contacto',
      parrafos: [
        'Para cualquier duda, comentario o solicitud relacionada con estos Términos y Condiciones, puede comunicarse con <b>Privas Magazine</b> a través de: <a href="mailto:contacto@privasmagazine.com">contacto@privasmagazine.com</a>.',
      ],
    },
  ],
};

export const DOCUMENTOS_LEGALES: Record<string, DocumentoLegal> = {
  privacidad: AVISO_PRIVACIDAD,
  terminos: TERMINOS_Y_CONDICIONES,
};
