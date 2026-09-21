import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import type { EdicionRevista } from '../../../../core/models';

const KEY_CONTADOR = 'privas-modal-edicion-veces';
const KEY_SESION = 'privas-modal-edicion-sesion';
const MAX_VECES = 2;
const RETRASO_MS = 2500;

const NOMBRE_TEMPORADA: Record<string, string> = {
  'primavera-verano': 'Primavera · Verano',
  'otono-invierno': 'Otoño · Invierno',
};

/**
 * Modal de promoción de la última edición (issue #53). Vive montado una
 * sola vez en `PublicLayout` porque tiene que reaccionar a navegaciones
 * dentro de dos rutas distintas (categoría y detalle de artículo) — no
 * tiene sentido duplicar esta lógica en cada página.
 *
 * Reglas: la primera vez que se entra a `/articulos?categoria=…` o a
 * `/articulos/:slug`, con ~2.5s de retraso, máximo 2 veces por navegador
 * (localStorage) y nunca dos veces en la misma sesión (sessionStorage) —
 * el "ya se decidió mostrar o no" se fija en cuanto la ruta califica, no
 * cuando el timer termina, para que no se dispare dos veces si la persona
 * navega rápido entre categorías.
 */
@Component({
  selector: 'app-modal-edicion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './modal-edicion.html',
  styleUrl: './modal-edicion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalEdicion implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly srv = inject(EdicionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = signal(false);
  readonly edicion = signal<EdicionRevista | null>(null);
  readonly nombreTemporada = NOMBRE_TEMPORADA;

  private timer?: ReturnType<typeof setTimeout>;
  private disparado = false;

  ngOnInit() {
    this.evaluar(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.evaluar(e.urlAfterRedirects));
  }

  private evaluar(url: string) {
    if (this.disparado || this.yaVisto() || !this.calificaRuta(url)) return;

    this.disparado = true;
    try {
      sessionStorage.setItem(KEY_SESION, '1');
    } catch {
      /* Safari privado sin storage: seguimos, solo perdemos el límite */
    }
    this.timer = setTimeout(() => void this.intentarAbrir(), RETRASO_MS);
  }

  private calificaRuta(url: string): boolean {
    const ruta = url.split('?')[0].split('#')[0];
    if (ruta.startsWith('/revistas')) return false;
    const esCategoria = ruta === '/articulos' && url.includes('categoria=');
    const esArticulo = /^\/articulos\/[^/]+$/.test(ruta);
    return esCategoria || esArticulo;
  }

  private yaVisto(): boolean {
    try {
      if (sessionStorage.getItem(KEY_SESION)) return true;
      return Number(localStorage.getItem(KEY_CONTADOR) ?? '0') >= MAX_VECES;
    } catch {
      return true; // sin storage disponible, mejor no insistir
    }
  }

  private async intentarAbrir() {
    // Si mientras esperábamos ya se fue a /revistas, no interrumpir.
    if (this.router.url.startsWith('/revistas')) return;
    try {
      const [ultima] = await this.srv.listarPublicas();
      if (!ultima) return;
      this.edicion.set(ultima);
      this.abierto.set(true);
      document.body.style.overflow = 'hidden';
      try {
        const veces = Number(localStorage.getItem(KEY_CONTADOR) ?? '0');
        localStorage.setItem(KEY_CONTADOR, String(veces + 1));
      } catch {
        /* idem */
      }
    } catch {
      /* si falla la carga de ediciones, simplemente no se muestra nada */
    }
  }

  cerrar() {
    this.abierto.set(false);
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  alEscape() {
    if (this.abierto()) this.cerrar();
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
    if (this.abierto()) document.body.style.overflow = '';
  }
}
