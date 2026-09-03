import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewsletterService } from '../../../../core/services/newsletter.service';

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
      <form (ngSubmit)="enviar()">
        <input
          type="email"
          name="email"
          [(ngModel)]="email"
          placeholder="tu@correo.com"
          aria-label="Correo electrónico"
          required
        />
        <button type="submit" [disabled]="enviando()">Suscribirme</button>
        @if (msg()) { <p [class.error]="!ok()" [class.ok]="ok()">{{ msg() }}</p> }
      </form>
    </div>
  `,
})
export class NewsletterForm {
  private readonly srv = inject(NewsletterService);
  email = '';
  readonly enviando = signal(false);
  readonly ok = signal(false);
  readonly msg = signal('');

  async enviar() {
    this.enviando.set(true);
    this.msg.set('');
    const res = await this.srv.suscribir(this.email);
    this.enviando.set(false);
    this.ok.set(res.ok);
    this.msg.set(
      res.ok
        ? 'Listo. Revisa tu correo para confirmar la suscripción.'
        : res.error ?? 'No se pudo registrar.',
    );
    if (res.ok) this.email = '';
  }
}
