import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

interface SeccionDoc {
  id: string;
  titulo: string;
}

/**
 * Documentación para la dueña (issue #81): cómo funciona la aplicación, en
 * lenguaje llano. Vive en `/documentacion`, FUERA del panel de gestión, con su
 * propio layout de lectura (sidebar de índice + contenido). Es contenido
 * escrito a mano, no se genera de ningún lado: si cambia algo importante del
 * proyecto (costos, servicios, correos, permisos), hay que actualizarlo aquí.
 */
@Component({
  selector: 'app-documentacion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './documentacion.html',
  styleUrl: './documentacion.scss',
})
export class Documentacion {
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private readonly destroyRef = inject(DestroyRef);

  readonly secciones: SeccionDoc[] = [
    { id: 'inicio', titulo: 'Qué es esta aplicación' },
    { id: 'roles', titulo: 'Roles y permisos' },
    { id: 'articulos', titulo: 'Artículos' },
    { id: 'ediciones', titulo: 'Ediciones de la revista' },
    { id: 'marcas', titulo: 'Marcas y categorías' },
    { id: 'imagenes', titulo: 'Tamaños de imágenes' },
    { id: 'correos', titulo: 'Correos' },
    { id: 'seguridad', titulo: 'Seguridad y respaldos' },
    { id: 'tecnologias', titulo: 'Tecnologías y servicios' },
    { id: 'automatico', titulo: 'Lo que pasa solo' },
    { id: 'llaves', titulo: 'Llaves y contraseñas' },
    { id: 'costos', titulo: 'Costos' },
    { id: 'problemas', titulo: 'Si algo falla' },
  ];

  readonly activa = signal('inicio');
  /** Índice como panel deslizable en mobile. */
  readonly menuAbierto = signal(false);

  constructor() {
    // Resalta en el índice la sección que se está leyendo.
    afterNextRender(() => {
      const raiz = this.main()?.nativeElement;
      if (!raiz || typeof IntersectionObserver === 'undefined') return;
      const obs = new IntersectionObserver(
        (entradas) => {
          const visible = entradas.find((e) => e.isIntersecting);
          if (visible) this.activa.set(visible.target.id.replace('doc-', ''));
        },
        { root: raiz, rootMargin: '-10% 0px -75% 0px' },
      );
      raiz.querySelectorAll('.doc-seccion').forEach((el) => obs.observe(el));
      this.destroyRef.onDestroy(() => obs.disconnect());
    });
  }

  ir(id: string) {
    this.activa.set(id);
    this.menuAbierto.set(false);
    document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
