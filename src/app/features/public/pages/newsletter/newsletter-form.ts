import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewsletterService } from '../../../../core/services/newsletter.service';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@Component({
  selector: 'app-newsletter-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="newsletter">
      <div class="newsletter-copy">
        <strong>Recibe lo nuevo</strong>
        <span>Un aviso cuando publicamos un artículo o sale una nueva edición.</span>
      </div>

      @if (ok()) {
        <p class="ok newsletter-exito">{{ msg() }}</p>
      } @else {
        <form (ngSubmit)="enviar()" novalidate>
          <input
            type="email"
            name="email"
            [(ngModel)]="email"
            (blur)="tocado.set(true)"
            placeholder="tu@correo.com"
            aria-label="Correo electrónico"
            autocomplete="email"
            [attr.aria-invalid]="mostrarError() ? 'true' : null"
            required
          />
          <button type="submit" [disabled]="enviando() || !emailValido()">
            {{ enviando() ? 'Enviando…' : 'Suscribirme' }}
          </button>
          @if (mostrarError()) {
            <p class="error" role="alert">Escribe un correo válido.</p>
          } @else if (msg()) {
            <p class="error" role="alert">{{ msg() }}</p>
          }
        </form>
      }
    </div>
  `,
  styles: `
    .newsletter-exito {
      margin: 0;
      font-weight: 500;
    }
  `,
})
export class NewsletterForm {
  private readonly srv = inject(NewsletterService);
  email = '';
  readonly enviando = signal(false);
  readonly ok = signal(false);
  readonly msg = signal('');
  readonly tocado = signal(false);

  readonly emailValido = computed(() => EMAIL_RE.test(this.email.trim()));
  readonly mostrarError = computed(
    () => this.tocado() && this.email.trim().length > 0 && !this.emailValido(),
  );

  async enviar() {
    this.tocado.set(true);
    if (!this.emailValido() || this.enviando()) return;
    this.enviando.set(true);
    this.msg.set('');
    const res = await this.srv.suscribir(this.email);
    this.enviando.set(false);
    this.ok.set(res.ok);
    this.msg.set(
      res.ok
        ? 'Listo. Te enviamos un correo para confirmar la suscripción.'
        : res.error ?? 'No se pudo registrar. Intenta de nuevo.',
    );
    if (res.ok) this.email = '';
  }
}
