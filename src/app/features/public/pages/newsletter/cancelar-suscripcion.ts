import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NewsletterService } from '../../../../core/services/newsletter.service';

type Estado = 'cargando' | 'exito' | 'error';

@Component({
  selector: 'app-cancelar-suscripcion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cancelar-suscripcion.html',
  styleUrl: './suscripcion-estado.scss',
})
export class CancelarSuscripcion implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly srv = inject(NewsletterService);
  readonly estado = signal<Estado>('cargando');
  readonly mensaje = signal('Procesando tu baja…');

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado.set('error');
      this.mensaje.set('Falta el token en el enlace.');
      return;
    }
    const res = await this.srv.cancelar(token);
    this.estado.set(res.ok ? 'exito' : 'error');
    this.mensaje.set(
      res.ok
        ? 'Si el enlace era válido, tu suscripción quedó cancelada. Ya no recibirás más correos nuestros.'
        : `No se pudo procesar el enlace: ${res.mensaje}`,
    );
  }
}
