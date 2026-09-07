import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsletterForm } from '../../pages/newsletter/newsletter-form';

/** Iconos sociales (paths SVG 24×24, `fill`). */
interface Red {
  nombre: string;
  url: string;
  icono: string;
}

/**
 * Pie de marca del sitio público. Se renderiza una sola vez desde
 * `PublicLayout`; no recibe entradas.
 */
@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, NewsletterForm],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  readonly anio = new Date().getFullYear();

  readonly redes: Red[] = [
    {
      nombre: 'Instagram',
      url: 'https://instagram.com/privasmagazine',
      icono:
        'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4a3.7 3.7 0 0 1-1.4-.9 3.7 3.7 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1a3.3 3.3 0 0 0-.8-1.3 3.3 3.3 0 0 0-1.3-.8c-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm5.1-3.3a1.2 1.2 0 1 1 0 2.3 1.2 1.2 0 0 1 0-2.3Z',
    },
    {
      nombre: 'X',
      url: 'https://x.com/privasmagazine',
      icono:
        'M17.5 3h3l-6.6 7.5L22 21h-6l-4.4-5.8L6.5 21h-3l7-8L2 3h6.2l4 5.3L17.5 3Zm-1 16h1.7L7.6 4.8H5.8L16.5 19Z',
    },
    {
      nombre: 'Facebook',
      url: 'https://facebook.com/privasmagazine',
      icono:
        'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z',
    },
    {
      nombre: 'TikTok',
      url: 'https://tiktok.com/@privasmagazine',
      icono:
        'M16.5 3c.3 2 1.5 3.7 3.5 4v2.6c-1.4 0-2.7-.4-3.8-1.1v6.9a6.4 6.4 0 1 1-6.4-6.4c.3 0 .7 0 1 .1v2.7a3.7 3.7 0 1 0 2.6 3.5V3h3.1Z',
    },
    {
      nombre: 'YouTube',
      url: 'https://youtube.com/@privasmagazine',
      icono:
        'M23 12s0-3.2-.4-4.7a3 3 0 0 0-2.1-2.1C18.9 4.7 12 4.7 12 4.7s-6.9 0-8.5.5A3 3 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3 3 0 0 0 2.1 2.1c1.6.5 8.5.5 8.5.5s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1C23 15.2 23 12 23 12ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z',
    },
  ];
}
