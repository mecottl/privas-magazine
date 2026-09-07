import { Component, OnInit, inject, signal } from '@angular/core';
import { EdicionesService } from '../../../../core/services/ediciones.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { mensajeError } from '../../../../core/services/errores';
import type { EdicionRevista } from '../../../../core/models';

const NOMBRE_TEMPORADA: Record<string, string> = {
  'primavera-verano': 'Primavera-Verano',
  'otono-invierno': 'Otoño-Invierno',
};

@Component({
  selector: 'app-revistas',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './revistas.html',
  styleUrl: './revistas.scss',
})
export class Revistas implements OnInit {
  private readonly srv = inject(EdicionesService);
  readonly ediciones = signal<EdicionRevista[]>([]);
  readonly error = signal('');
  readonly cargando = signal(true);

  nombreTemporada(t: string): string {
    return NOMBRE_TEMPORADA[t] ?? t;
  }

  async ngOnInit() {
    try {
      this.ediciones.set(await this.srv.listarPublicas());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
