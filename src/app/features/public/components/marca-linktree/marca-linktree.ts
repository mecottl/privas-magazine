import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { EnlaceMarca, Marca } from '../../../../core/models';

const ENLACE_META: Record<string, { label: string; icono: string }> = {
  instagram: {
    label: 'Instagram',
    icono:
      'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm4.75-3a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 16.75 6.5Z',
  },
  facebook: {
    label: 'Facebook',
    icono:
      'M14 9h3l.5-3H14V4.5c0-.8.3-1.5 1.6-1.5H17V.2C16.7.1 15.6 0 14.4 0 11.8 0 10 1.6 10 4.3V6H7v3h3v11h4V9Z',
  },
  tiktok: {
    label: 'TikTok',
    icono:
      'M16 2c.4 2.6 1.9 4.4 4.5 4.7v3c-1.7.1-3.3-.4-4.5-1.3v6.9c0 5-4.6 8.2-9 6.2-3.6-1.6-4-6.6-.7-8.9 1.6-1.1 3.2-1.2 4.7-.9v3.2c-.6-.2-1.3-.3-2 0-1.5.6-1.7 2.7-.3 3.6 1.4.9 3.5.1 3.5-1.9V2H16Z',
  },
  youtube: {
    label: 'YouTube',
    icono:
      'M23 12s0-3.3-.4-4.9a2.9 2.9 0 0 0-2-2C18.8 4.6 12 4.6 12 4.6s-6.8 0-8.6.5a2.9 2.9 0 0 0-2 2C1 8.7 1 12 1 12s0 3.3.4 4.9a2.9 2.9 0 0 0 2 2c1.8.5 8.6.5 8.6.5s6.8 0 8.6-.5a2.9 2.9 0 0 0 2-2C23 15.3 23 12 23 12ZM10 15V9l5 3-5 3Z',
  },
  x: {
    label: 'X',
    icono:
      'M18.9 2H22l-7 8 8.2 12H16l-5-7.3L5.2 22H2l7.5-8.6L1.5 2H9l4.5 6.6L18.9 2Zm-1.1 18h1.7L6.3 3.8H4.5L17.8 20Z',
  },
  linkedin: {
    label: 'LinkedIn',
    icono:
      'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4V9Z',
  },
  whatsapp: {
    label: 'WhatsApp',
    icono:
      'M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7s-3.7-3.2-3.8-3.4c-.1-.2-.9-1.2-.9-2.3s.6-1.6.8-1.9c.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.6 1 1.9 1.2.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.1.1.6-.1 1.2Z',
  },
  otro: {
    label: 'Enlace',
    icono:
      'M10 13a5 5 0 0 0 7.5.5l3-3A5 5 0 0 0 13.5 3.5l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3A5 5 0 0 0 10.5 20.5l1.7-1.7',
  },
};

/**
 * Panel modal con el "linktree" de una marca: logo, nombre, bio y enlaces.
 * Lo montan la portada y `/marcas`; emite `(cerrar)` con backdrop, Esc o la X.
 *
 * El overlay se traslada a `<body>` al abrir para que quede por encima de
 * todo (header fijo, pie, franjas con z-index propio) sin depender del
 * contexto de apilamiento de quien lo monte.
 */
@Component({
  selector: 'app-marca-linktree',
  standalone: true,
  templateUrl: './marca-linktree.html',
  styleUrl: './marca-linktree.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarcaLinktree implements AfterViewInit, OnDestroy {
  readonly marca = input.required<Marca>();
  readonly cerrar = output<void>();

  private readonly overlayRef =
    viewChild.required<ElementRef<HTMLElement>>('overlay');
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly enlaces = computed<EnlaceMarca[]>(() =>
    (this.marca().enlaces ?? []).filter((e) => e.url),
  );

  meta(tipo: string) {
    return ENLACE_META[tipo] ?? ENLACE_META['otro'];
  }

  @HostListener('document:keydown.escape')
  alEscape() {
    this.cerrar.emit();
  }

  ngAfterViewInit() {
    document.body.appendChild(this.overlayRef().nativeElement);
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    // Devolver el nodo a su sitio original para que Angular lo destruya limpio.
    this.host.nativeElement.appendChild(this.overlayRef().nativeElement);
    document.body.style.overflow = '';
  }
}
