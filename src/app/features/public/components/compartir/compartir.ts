import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

interface EnlaceCompartir {
  nombre: string;
  href: string;
  icono: string;
}

/**
 * Botón "Compartir" para artículos y ediciones (issue #83). Un solo botón:
 * donde el navegador tiene el menú nativo de compartir (iPhone, Android y
 * varios de escritorio) lo abre, con todas las apps de la persona (WhatsApp,
 * Instagram, Mensajes...). Donde no existe, abre un menú chico con WhatsApp,
 * Facebook, X, Telegram y "Copiar enlace". Hereda el color del contenedor.
 */
@Component({
  selector: 'app-compartir',
  standalone: true,
  templateUrl: './compartir.html',
  styleUrl: './compartir.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Compartir {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly url = input.required<string>();
  readonly titulo = input.required<string>();
  /** Solo el ícono, sin la palabra "Compartir" (para tarjetas). */
  readonly compacto = input(false);

  readonly menuAbierto = signal(false);
  readonly copiado = signal(false);

  readonly enlaces = computed<EnlaceCompartir[]>(() => {
    const u = encodeURIComponent(this.url());
    const t = encodeURIComponent(this.titulo());
    return [
      {
        nombre: 'WhatsApp',
        href: `https://wa.me/?text=${t}%20${u}`,
        icono:
          'M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3ZM12 21.8a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.9 9.9 0 0 1-1.5-5.3c0-5.5 4.4-9.9 9.9-9.9 2.6 0 5.1 1 7 2.9a9.8 9.8 0 0 1 2.9 7c0 5.4-4.4 9.9-9.9 9.9ZM20.4 3.5A11.8 11.8 0 0 0 12 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.7.9 3.7 1.4 5.7 1.4 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.3Z',
      },
      {
        nombre: 'Facebook',
        href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
        icono:
          'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z',
      },
      {
        nombre: 'X',
        href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
        icono:
          'M17.5 3h3l-6.6 7.5L22 21h-6l-4.4-5.8L6.5 21h-3l7-8L2 3h6.2l4 5.3L17.5 3Zm-1 16h1.7L7.6 4.8H5.8L16.5 19Z',
      },
      {
        nombre: 'Telegram',
        href: `https://t.me/share/url?url=${u}&text=${t}`,
        icono:
          'M21.9 4.4 18.7 19.5c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.7 13 2 11.5c-1-.3-1-1 .2-1.5L20.4 3c.9-.3 1.7.2 1.5 1.4Z',
      },
    ];
  });

  async compartir() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: this.titulo(), url: this.url() });
        return;
      } catch (e) {
        // La persona cerró el menú nativo: no es un error ni hay que abrir otro.
        if ((e as { name?: string })?.name === 'AbortError') return;
      }
    }
    this.menuAbierto.update((v) => !v);
  }

  async copiar() {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copiado.set(true);
      setTimeout(() => {
        this.copiado.set(false);
        this.menuAbierto.set(false);
      }, 1400);
    } catch {
      /* sin permiso de portapapeles: las otras opciones siguen funcionando */
    }
  }

  @HostListener('document:click', ['$event'])
  alClickFuera(e: MouseEvent) {
    if (this.menuAbierto() && !this.host.nativeElement.contains(e.target as Node)) {
      this.menuAbierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  alEscape() {
    this.menuAbierto.set(false);
  }
}
