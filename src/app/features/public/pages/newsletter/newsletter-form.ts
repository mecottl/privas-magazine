import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewsletterService } from '../../../../core/services/newsletter.service';

@Component({
  selector: 'app-newsletter-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="newsletter" (ngSubmit)="enviar()">
      <label>Suscríbete al newsletter
        <input type="email" name="email" [(ngModel)]="email" placeholder="tu@correo.com" required />
      </label>
      <button type="submit" [disabled]="enviando()">Suscribirme</button>
      @if (msg()) { <p [class.error]="!ok()">{{ msg() }}</p> }
    </form>
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
