import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

/**
 * Revela un elemento (fundido + ascenso) cuando entra en el viewport.
 *
 * - Usa IntersectionObserver.
 * - Lo que ya está visible al montar se revela de inmediato (sin esperar al
 *   observer, que puede tardar si la pestaña está en segundo plano).
 * - Red de seguridad: a los 1.2 s todo lo pendiente se muestra igual.
 * - Se desactiva con `prefers-reduced-motion: reduce`.
 * - Escalonado: `data-reveal-stagger` en el contenedor + `[reveal]` en los hijos.
 */
@Directive({
  selector: '[reveal]',
  standalone: true,
  host: { class: 'reveal' },
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    const sinMovimiento =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (sinMovimiento || typeof IntersectionObserver === 'undefined') {
      this.mostrar();
      return;
    }

    const padre = node.parentElement;
    if (padre?.hasAttribute('data-reveal-stagger')) {
      const i = Array.prototype.indexOf.call(padre.children, node);
      node.style.setProperty('--reveal-i', String(Math.max(i, 0)));
    }

    // Ya visible al montar → revelar sin esperar al observer.
    const r = node.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh * 0.92 && r.bottom > 0) {
      this.mostrar();
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) this.mostrar();
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
      );
      this.observer.observe(node);
      this.timer = setTimeout(() => this.mostrar(), 1200);
    });
  }

  private mostrar(): void {
    this.el.nativeElement.classList.add('reveal--visible');
    this.observer?.disconnect();
    this.observer = undefined;
    if (this.timer) clearTimeout(this.timer);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.timer) clearTimeout(this.timer);
  }
}
