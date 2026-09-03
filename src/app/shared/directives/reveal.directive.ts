import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

/**
 * Revela un elemento (fade + rise) cuando entra en el viewport.
 *
 * - Usa IntersectionObserver, no scroll listeners.
 * - Se desactiva por completo con `prefers-reduced-motion: reduce` (el elemento
 *   queda visible desde el inicio).
 * - Para escalonar hijos, poné `data-reveal-stagger` en el contenedor y
 *   `[reveal]` en cada hijo: el CSS usa `--reveal-i`.
 */
@Directive({
  selector: '[reveal]',
  standalone: true,
  host: { class: 'reveal' },
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    const sinMovimiento =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (sinMovimiento || typeof IntersectionObserver === 'undefined') {
      node.classList.add('reveal--visible');
      return;
    }

    // Índice dentro de un contenedor escalonado → retardo incremental.
    const padre = node.parentElement;
    if (padre?.hasAttribute('data-reveal-stagger')) {
      const i = Array.prototype.indexOf.call(padre.children, node);
      node.style.setProperty('--reveal-i', String(Math.max(i, 0)));
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
