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
import { HeroMedia } from '../../components/hero-media/hero-media';
import { mensajeError } from '../../../../core/services/errores';
import {
  mismoSlug,
  normalizarSlug,
  normalizarTexto,
  ordenSeccion,
  type Articulo,
  type Categoria,
} from '../../../../core/models';

interface HeroSeccion {
  eyebrow: string;
  titulo: string;
  texto: string;
  /** Clave del asset para app-hero-media (`cat-turismo`, `cat-archivo`…). */
  media: string;
}

const HERO_CATEGORIA: Record<string, Omit<HeroSeccion, 'media' | 'eyebrow'>> = {
  turismo: {
    titulo: 'Turismo',
    texto: 'Artículos con todo lo especial de viajar.',
  },
  gastronomia: {
    titulo: 'Gastronomía',
    texto: 'Viajar por el mundo, con comida.',
  },
  cultura: {
    titulo: 'Cultura',
    texto: 'Viajar por el mundo, con cultura.',
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

const HERO_ARCHIVO: Omit<HeroSeccion, 'media'> = {
  eyebrow: 'El archivo completo',
  titulo: 'Artículos',
  texto:
    'Todo lo que hemos publicado: turismo, gastronomía, cultura, arte y entretenimiento.',
};

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [RevealDirective, ArticuloCard, HeroMedia],
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
  /** Término de búsqueda activo (viene de `?q=`). */
  readonly q = signal('');
  /** Lo que hay escrito en el input ahora mismo (se refleja en `?q=` con retardo). */
  readonly texto = signal('');
  readonly mismoSlug = mismoSlug;
  readonly skeletons = [0, 1, 2, 3, 4, 5];

  private debounce?: ReturnType<typeof setTimeout>;

  /** Hero (imagen + copia) según la categoría activa o el modo búsqueda. */
  readonly hero = computed<HeroSeccion>(() => {
    if (this.q()) {
      return {
        eyebrow: 'Búsqueda',
        titulo: `«${this.q()}»`,
        texto: 'Resultados en todo el archivo de PRIVAS Magazine.',
        media: 'cat-archivo',
      };
    }
    const slug = normalizarSlug(this.categoria());
    const base = HERO_CATEGORIA[slug];
    if (!base) {
      return { ...HERO_ARCHIVO, media: 'cat-archivo' };
    }
    return { eyebrow: 'PRIVAS Magazine', ...base, media: `cat-${slug}` };
  });

  /** Artículos ya filtrados por el término de búsqueda (la categoría la
   *  aplica el servicio; en modo búsqueda se ignora). */
  readonly visibles = computed<Articulo[]>(() => {
    const t = normalizarTexto(this.q());
    if (!t) return this.articulos();
    const terminos = t.split(/\s+/).filter(Boolean);
    return this.articulos().filter((a) => {
      const heno = normalizarTexto(
        [
          a.titulo,
          a.extracto ?? '',
          (a.categorias ?? []).map((c) => c.nombre).join(' '),
          a.autor_texto ?? '',
        ].join(' '),
      );
      return terminos.every((term) => heno.includes(term));
    });
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
        const q = (pm.get('q') ?? '').trim();
        this.q.set(q);
        this.texto.set(q);
        this.categoria.set(q ? '' : (pm.get('categoria') ?? ''));
        void this.cargar();
      });
  }

  filtrar(slug: string) {
    this.navegar({ categoria: slug || null, q: null });
  }

  /** Cada pulsación: refleja el texto y, tras una pausa, actualiza `?q=`. */
  alEscribir(valor: string) {
    this.texto.set(valor);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      const q = valor.trim();
      if (q === this.q()) return;
      this.navegar({ q: q || null, categoria: null });
    }, 260);
  }

  limpiarBusqueda() {
    clearTimeout(this.debounce);
    this.texto.set('');
    if (this.q()) this.navegar({ q: null });
  }

  private navegar(queryParams: Record<string, string | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  async cargar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      // En modo búsqueda traemos todo el archivo; si no, filtra el servicio.
      const cat = this.q() ? undefined : this.categoria() || undefined;
      this.articulos.set(await this.srv.listarPublicos(cat));
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
      this.primeraCarga.set(false);
    }
  }
}
