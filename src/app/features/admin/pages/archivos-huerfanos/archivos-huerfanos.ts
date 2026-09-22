import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  ArchivosHuerfanosService,
  type ReporteHuerfanos,
} from '../../../../core/services/archivos-huerfanos.service';
import { InfoTip } from '../../../../shared/components/info-tip/info-tip';
import { mensajeError } from '../../../../core/services/errores';

@Component({
  selector: 'app-admin-archivos-huerfanos',
  standalone: true,
  imports: [DatePipe, InfoTip],
  templateUrl: './archivos-huerfanos.html',
})
export class ArchivosHuerfanos {
  private readonly srv = inject(ArchivosHuerfanosService);
  readonly reporte = signal<ReporteHuerfanos | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  async auditar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      this.reporte.set(await this.srv.auditar());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
