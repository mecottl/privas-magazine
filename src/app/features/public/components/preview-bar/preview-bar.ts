import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { salirModoPreview } from '../../../../core/preview-mode';
import { environment } from '../../../../../environments/environment';

/**
 * Barra fija de "Modo vista previa" (issue #82). El layout público solo la
 * monta si la bandera de `preview-mode` está activa; aquí además se confirma
 * que de verdad hay una sesión de admin — si no, se apaga la bandera y no se
 * muestra nada (un visitante nunca la ve).
 */
@Component({
  selector: 'app-preview-bar',
  standalone: true,
  templateUrl: './preview-bar.html',
  styleUrl: './preview-bar.scss',
})
export class PreviewBar implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly visible = signal(false);

  async ngOnInit() {
    await this.auth.init();
    if (this.auth.esAdmin()) this.visible.set(true);
    else salirModoPreview();
  }

  volverAlPanel() {
    salirModoPreview();
    this.router.navigate([environment.adminBasePath, 'dashboard']);
  }

  ocultar() {
    salirModoPreview();
    this.visible.set(false);
  }
}
