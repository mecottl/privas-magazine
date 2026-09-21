import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Interstitial entre el correo de invitación y el link real de Supabase
 * (`?siguiente=<ConfirmationURL>`, ver `docs/email-invitacion.html`).
 *
 * Por qué existe: el link de invitación de Supabase es de un solo uso —
 * en cuanto algo lo "toca" el token se quema, exista o no una sesión real
 * detrás. Varios webmails (confirmado con Roundcube/cPanel) generan una
 * vista previa del link al abrir el correo, lo que dispara una petición
 * automática a esa URL ANTES de que la persona le dé clic — y cuando de
 * verdad hace clic, el link ya está usado ("Enlace inválido o vencido").
 *
 * Esta pantalla no hace ninguna petición sola: solo muestra un botón. Un
 * previsualizador automático (que no simula clics de mouse) nunca llega a
 * tocar el link real de Supabase; solo lo hace la persona, a propósito.
 */
@Component({
  selector: 'app-confirmar-invitacion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './confirmar-invitacion.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmarInvitacion {
  private readonly route = inject(ActivatedRoute);
  readonly siguiente = signal(
    this.route.snapshot.queryParamMap.get('siguiente') ?? '',
  );

  continuar() {
    const url = this.siguiente();
    if (url) window.location.href = url;
  }
}
