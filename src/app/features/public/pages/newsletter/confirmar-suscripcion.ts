import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NewsletterService } from '../../../../core/services/newsletter.service';

type Estado = 'cargando' | 'exito' | 'error';

@Component({
  selector: 'app-confirmar-suscripcion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './confirmar-suscripcion.html',
  styleUrl: './suscripcion-estado.scss',
})
export class ConfirmarSuscripcion implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly srv = inject(NewsletterService);
  readonly estado = signal<Estado>('cargando');
  readonly mensaje = signal('Confirmando tu suscripción…');

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado.set('error');
      this.mensaje.set('Falta el token en el enlace.');
      return;
    }
    // La Edge Function responde genérico a propósito (no revela si el token
    // existía), así que el mensaje al visitante también es neutro.
    const res = await this.srv.confirmar(token);
    this.estado.set(res.ok ? 'exito' : 'error');
    this.mensaje.set(
      res.ok
        ? 'Si el enlace era válido, tu suscripción quedó confirmada. ¡Gracias por sumarte!'
        : `No se pudo procesar el enlace: ${res.mensaje}`,
    );
  }
}
