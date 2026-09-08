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

const HERO_CATEGORIA: Record<string, Omit<HeroSeccion, 'img' | 'eyebrow'>> = {
  turismo: {
    titulo: 'Turismo',
    texto:
      'Artículos con todo lo especial de viajar.',
  },
  gastronomia: {
    titulo: 'Gastronomía',
    texto:
      'Viajar por el mundo, con comida.',
  },
  cultura: {
    titulo: 'Cultura',
    texto:
      'Viajar por el mundo, con cultura.',
  },
  arte: {
    titulo: 'Arte',
    texto: 'Viajar por el mundo, con arte.',
  },
  entretenimiento: {
    titulo: 'Entretenimiento',
    texto: 'Viajar por el mundo, con entretenimiento.',
  },
};

const HERO_ARCHIVO: Omit<HeroSeccion, 'img'> = {
  eyebrow: 'El archivo completo',
  titulo: 'Artículos',
  texto:
    'Todo lo que hemos publicado: turismo, gastronomía, cultura, arte y entretenimiento.',
};

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
  /** Solo la primera vez enseñamos esqueletos; al filtrar dejamos la rejilla
   *  anterior a la vista y la atenuamos mientras llega la nueva. */
  readonly primeraCarga = signal(true);
  readonly categoria = signal('');
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
    cats.sort(
      (a, b) =>
        ordenSeccion(a.slug) - ordenSeccion(b.slug) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );
    this.categorias.set(cats);
  
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        this.categoria.set(pm.get('categoria') ?? '');
        void this.cargar();
      });
  }

  filtrar(slug: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoria: slug || null },
      queryParamsHandling: 'merge',
    });
  }

  async cargar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      this.articulos.set(
        await this.srv.listarPublicos(this.categoria() || undefined),
      );
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
      this.primeraCarga.set(false);
    }
  }
}
