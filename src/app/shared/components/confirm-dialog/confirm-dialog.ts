import {
  Component,
  ElementRef,
  Injectable,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

export interface ConfirmOpts {
  titulo: string;
  mensaje?: string;
  /** Texto del botón de acción. Por defecto "Aceptar". */
  cta?: string;
  /** Estilo destructivo para la acción (borrar, etc.). */
  peligro?: boolean;
}

/**
 * Diálogo de confirmación reutilizable.
 * `confirm(opts)` devuelve una promesa que resuelve `true` / `false`.
 * Requiere un `<app-confirm-dialog />` montado una vez (en el shell de admin).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly estado = signal<{
    opts: ConfirmOpts;
    resolver: (v: boolean) => void;
  } | null>(null);

  confirm(opts: ConfirmOpts): Promise<boolean> {
    return new Promise((resolver) => this.estado.set({ opts, resolver }));
  }

  responder(ok: boolean): void {
    const e = this.estado();
    if (e) {
      e.resolver(ok);
      this.estado.set(null);
    }
  }
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly svc = inject(ConfirmService);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const abierto = this.svc.estado() !== null;
      const el = this.dlg().nativeElement;
      if (abierto && !el.open) el.showModal();
      if (!abierto && el.open) el.close();
    });
  }
}
