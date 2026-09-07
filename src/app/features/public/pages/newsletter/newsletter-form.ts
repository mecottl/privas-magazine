import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewsletterService } from '../../../../core/services/newsletter.service';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@Component({
  selector: 'app-newsletter-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './newsletter-form.html',
  styleUrl: './newsletter-form.scss',
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
