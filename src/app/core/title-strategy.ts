import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const SUFIJO = 'PRIVAS Magazine';

/**
 * Título de pestaña por ruta: `<title de la ruta> · PRIVAS Magazine`.
 * Las rutas declaran `title` en su config; sin `title` queda solo el sufijo.
 */
@Injectable({ providedIn: 'root' })
export class PrivasTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const propio = this.buildTitle(snapshot);
    this.title.setTitle(propio ? `${propio} · ${SUFIJO}` : SUFIJO);
  }
}
