import { Component, signal } from '@angular/core';

interface SeccionDoc {
  id: string;
  titulo: string;
}

/**
 * Documentación para la dueña (issue #81): cómo funciona la aplicación, en
 * lenguaje llano. Una sola página larga con índice que salta a cada sección.
 * Es contenido escrito a mano, no se genera de ningún lado: si cambia algo
 * importante del proyecto (costos, servicios, correos), hay que actualizarlo
 * aquí también.
 */
@Component({
  selector: 'app-admin-documentacion',
  standalone: true,
  templateUrl: './documentacion.html',
  styleUrl: './documentacion.scss',
})
export class Documentacion {
  readonly secciones: SeccionDoc[] = [
    { id: 'inicio', titulo: 'Qué es esta aplicación' },
    { id: 'roles', titulo: 'Roles y permisos' },
    { id: 'articulos', titulo: 'Artículos' },
    { id: 'ediciones', titulo: 'Ediciones de la revista' },
    { id: 'marcas', titulo: 'Marcas y categorías' },
    { id: 'correos', titulo: 'Correos' },
    { id: 'seguridad', titulo: 'Seguridad y respaldos' },
    { id: 'tecnologias', titulo: 'Tecnologías y servicios' },
    { id: 'automatico', titulo: 'Lo que pasa solo' },
    { id: 'llaves', titulo: 'Llaves y contraseñas' },
    { id: 'costos', titulo: 'Costos' },
    { id: 'problemas', titulo: 'Si algo falla' },
  ];

  readonly activa = signal('inicio');

  ir(id: string) {
    this.activa.set(id);
    document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
