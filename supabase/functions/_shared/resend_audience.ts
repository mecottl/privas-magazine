/**
 * Sincroniza un contacto con la audiencia de Resend (issue #64).
 *
 * `suscriptores_newsletter` es la fuente de verdad de nuestro doble opt-in,
 * pero el broadcast de `programar-publicacion` se manda a una audiencia de
 * Resend por separado — sin esto, confirmar/cancelar aquí nunca se reflejaba
 * allá y nadie recibía el newsletter aunque `activo = true`.
 *
 * Tolerante: si faltan las variables de entorno o Resend falla, solo loguea
 * (no rompe la respuesta genérica de confirmar/cancelar-suscripcion).
 */
export async function sincronizarContactoAudiencia(
  email: string,
  suscrito: boolean,
): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const audienceId = Deno.env.get('RESEND_AUDIENCE_ID');
  if (!apiKey || !audienceId) {
    console.error(
      'Resend: RESEND_API_KEY o RESEND_AUDIENCE_ID ausente, no se sincronizó el contacto',
    );
    return;
  }

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const base = `https://api.resend.com/audiences/${audienceId}/contacts`;

  try {
    const crear = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, unsubscribed: !suscrito }),
    });
    if (crear.ok) return;

    // Ya existía como contacto (ej. se resuscribió) — actualizar su estado.
    const actualizar = await fetch(`${base}/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ unsubscribed: !suscrito }),
    });
    if (!actualizar.ok) {
      console.error(
        `Resend: no se pudo sincronizar el contacto ${email}: ${actualizar.status} ${await actualizar.text()}`,
      );
    }
  } catch (e) {
    console.error('Resend: error no fatal al sincronizar contacto', e);
  }
}
