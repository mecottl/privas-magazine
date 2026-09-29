import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';

/**
 * Icono "i" con tooltip a un clic/tap (issue de UX: las descripciones de
 * qué es cada sección ocupaban espacio fijo todo el tiempo). Clic para
 * abrir/cerrar en vez de solo hover — así también funciona en mobile,
 * donde no hay hover.
 */
@Component({
  selector: 'app-info-tip',
  standalone: true,
  templateUrl: './info-tip.html',
  styleUrl: './info-tip.scss',
})
export class InfoTip {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly abierto = signal(false);

  toggle() {
    this.abierto.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  alClickFuera(e: MouseEvent) {
    if (this.abierto() && !this.host.nativeElement.contains(e.target as Node)) {
      this.abierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  alEscape() {
    this.abierto.set(false);
  }
}
