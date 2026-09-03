import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NewsletterService } from '../../../../core/services/newsletter.service';

@Component({
  selector: 'app-confirmar-suscripcion',
  standalone: true,
  template: `
    <section class="page">
      <h1>Confirmar suscripción</h1>
      <p>{{ mensaje() }}</p>
    </section>
  `,
})
export class ConfirmarSuscripcion implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly srv = inject(NewsletterService);
  readonly mensaje = signal('Procesando…');

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.mensaje.set('Falta el token en el enlace.');
      return;
    }
    const res = await this.srv.confirmar(token);
    // La Edge Function responde genérico a propósito (no revela si el token
    // existía), así que el mensaje al visitante también es neutro.
    this.mensaje.set(
      res.ok
        ? 'Si el enlace era válido, tu suscripción quedó confirmada. ¡Gracias!'
        : `No se pudo procesar el enlace: ${res.mensaje}`,
    );
  }
}
