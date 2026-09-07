import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ArticulosService } from '../../../../core/services/articulos.service';
import { CategoriasService } from '../../../../core/services/categorias.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { ArticuloCard } from '../../components/articulo-card/articulo-card';
import { mensajeError } from '../../../../core/services/errores';
import {
  mismoSlug,
  normalizarSlug,
  ordenSeccion,
  type Articulo,
  type Categoria,
} from '../../../../core/models';

interface HeroSeccion {
  eyebrow: string;
  titulo: string;
  texto: string;
  img: string;
}

/** Copia del hero por categoría. La imagen vive en `public/categorias/`. */
const HERO_CATEGORIA: Record<string, Omit<HeroSeccion, 'img' | 'eyebrow'>> = {
  turismo: {
    titulo: 'Turismo',
    texto:
      'Rincones, rutas y escapadas para descubrir la península de Yucatán a tu ritmo.',
  },
  gastronomia: {
    titulo: 'Gastronomía',
    texto:
      'Cocinas de humo, mercados y sobremesas: los sabores que cuentan la región.',
  },
  cultura: {
    titulo: 'Cultura',
    texto:
      'Tradiciones vivas, comunidades y el pulso cotidiano de los pueblos mayas y coloniales.',
  },
  arte: {
    titulo: 'Arte',
    texto: 'Talleres, oficios y creadores que le ponen color a la península.',
  },
  entretenimiento: {
    titulo: 'Entretenimiento',
    texto: 'Agenda, música y planes para vivir la península cuando cae el sol.',
  },
};

const HERO_ARCHIVO: Omit<HeroSeccion, 'img'> = {
  eyebrow: 'El archivo completo',
  titulo: 'Artículos',
  texto:
    'Todo lo que hemos publicado sobre la península: turismo, gastronomía, cultura, arte y entretenimiento.',
};

/**
 * Página de artículos / categorías (`/articulos`, `/articulos?categoria=slug`).
 * Misma estructura que la portada: hero a sangre con copia de la categoría +
 * franja teal con los filtros y la rejilla de tarjetas (app-articulo-card).
 */
@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [RevealDirective, ArticuloCard],
  templateUrl: './articulos.html',
  styleUrl: './articulos.scss',
})
export class Articulos implements OnInit {
  private readonly srv = inject(ArticulosService);
  private readonly catSrv = inject(CategoriasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly articulos = signal<Articulo[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);
  /** slug de categoría activo; '' = todas. Refleja el query param `categoria`. */
  readonly categoria = signal('');
  /** Expuesto al template para resaltar la píldora activa sin depender de acentos. */
  readonly mismoSlug = mismoSlug;
  readonly skeletons = [0, 1, 2, 3, 4, 5];

  /** Hero (imagen + copia) según la categoría activa. */
  readonly hero = computed<HeroSeccion>(() => {
    const slug = normalizarSlug(this.categoria());
    const base = HERO_CATEGORIA[slug];
    if (!base) {
      return { ...HERO_ARCHIVO, img: '/categorias/archivo.jpg' };
    }
    return {
      eyebrow: 'PRIVAS Magazine',
      ...base,
      img: `/categorias/${slug}.jpg`,
    };
  });

  async ngOnInit() {
    const cats = await this.catSrv.listar().catch(() => []);
    // Mismo orden que la navegación del header (secciones editoriales primero).
    cats.sort(
      (a, b) =>
        ordenSeccion(a.slug) - ordenSeccion(b.slug) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );
    this.categorias.set(cats);

    // El filtro se toma de la URL (?categoria=slug) para que los enlaces del
    // header funcionen aunque ya estemos en /articulos.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        this.categoria.set(pm.get('categoria') ?? '');
        void this.cargar();
      });
  }

  /** Cambia el filtro escribiéndolo en la URL (una sola fuente de verdad). */
  filtrar(slug: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoria: slug || null },
      queryParamsHandling: 'merge',
    });
  }

  async cargar() {
    this.error.set('');
    try {
      this.articulos.set(
        await this.srv.listarPublicos(this.categoria() || undefined),
      );
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
