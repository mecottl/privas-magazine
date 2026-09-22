import { TestBed } from '@angular/core/testing';
import { NewsletterForm } from './newsletter-form';
import { NewsletterService } from '../../../../core/services/newsletter.service';

/**
 * Regresión de un bug real (issue #64): `email` era un campo plano, pero
 * `emailValido`/`mostrarError` eran `computed()` — que solo reaccionan a
 * cambios de signal. El botón nunca se habilitaba para nadie en producción
 * hasta que se probó en vivo. Este test falla si alguien vuelve a hacer
 * `email` un campo plano en vez de signal.
 */
describe('NewsletterForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewsletterForm],
      providers: [{ provide: NewsletterService, useValue: { suscribir: async () => ({ ok: true }) } }],
    });
  });

  it('habilita el botón cuando el email es válido', () => {
    const fixture = TestBed.createComponent(NewsletterForm);
    const cmp = fixture.componentInstance;

    expect(cmp.emailValido()).toBe(false);

    cmp.email.set('persona@correo.com');
    fixture.detectChanges();

    expect(cmp.emailValido()).toBe(true);
  });

  it('muestra error solo después de tocar el campo con un email inválido', () => {
    const fixture = TestBed.createComponent(NewsletterForm);
    const cmp = fixture.componentInstance;

    cmp.email.set('no-es-un-correo');
    fixture.detectChanges();
    expect(cmp.mostrarError()).toBe(false);

    cmp.tocado.set(true);
    fixture.detectChanges();
    expect(cmp.mostrarError()).toBe(true);
  });
});
