import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NewsletterService } from '../../../../core/services/newsletter.service';

@Component({
  selector: 'app-cancelar-suscripcion',
  standalone: true,
  template: `
    <section class="page">
      <h1>Cancelar suscripción</h1>
      <p>{{ mensaje() }}</p>
    </section>
  `,
})
export class CancelarSuscripcion implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly srv = inject(NewsletterService);
  readonly mensaje = signal('Procesando…');

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.mensaje.set('Falta el token en el enlace.');
      return;
    }
    const res = await this.srv.cancelar(token);
    this.mensaje.set(
      res.ok
        ? 'Si el enlace era válido, tu suscripción quedó cancelada.'
        : `No se pudo procesar el enlace: ${res.mensaje}`,
    );
  }
}
