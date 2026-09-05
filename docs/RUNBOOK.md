# Runbook de incidentes — PRIVAS Magazine

Para consultar rápido bajo estrés. No es para leer con calma, es para
encontrar el siguiente paso en 10 segundos.

---

## 🔴 El sitio no carga / está caído

1. **¿Es el sitio o es tu internet?** Prueba desde el celular con datos
   móviles (no wifi) antes de asumir que es el servidor.
2. Revisa el estado de Vercel: https://www.vercel-status.com/
   (o el de Akky si ya migramos — pendiente actualizar este link).
3. Revisa el último deploy en GitHub → pestaña Actions del repo:
   https://github.com/mecottl/privas-magazine/actions
   - Si el último run tiene ❌ rojo, el sitio puede estar sirviendo una
     versión vieja o rota. Click en el run → ver logs → identificar el
     paso que falló.
4. Si el build pasó pero el sitio igual no carga: revisa que Supabase no
   esté pausado (ver siguiente sección) — sin base de datos, la página
   puede cargar en blanco.

## 🟡 Supabase se pausó por inactividad

El plan Free pausa el proyecto tras 7 días sin actividad.

1. Entra a https://supabase.com/dashboard → el proyecto
   `xiqqhjdpmqdnzsvpjhwq` va a mostrar un botón "Restore" o "Resume".
2. Click ahí. Tarda 1-2 minutos en reactivarse.
3. Una vez activo, el sitio debería volver a funcionar solo (no hace
   falta redeploy) — Angular vuelve a poder hablar con la base de datos.
4. **Para que no vuelva a pasar**: el cron de `programar-publicacion`
   corre cada 15 min y ya cuenta como actividad — si el proyecto se pausó
   de todos modos, revisa si el cron sigue activo (ver siguiente sección).

## 🟡 El cron dejó de correr (artículos programados no se publican)

1. Supabase Dashboard → Database → Cron Jobs (o `select * from cron.job;`
   en el SQL Editor). Confirma que `programar-publicacion` sigue ahí y
   `active = true`.
2. Si no aparece: alguien lo borró o el proyecto se reseteó — hay que
   volver a crearlo (ver `docs/SECRETS.md`, sección "pg_cron →
   programar-publicacion", tiene el SQL exacto para copiar/pegar).
3. Si aparece pero no corrió: revisa `select * from cron.job_run_details
   order by start_time desc limit 10;` para ver el error real.
4. Causa más común: `CRON_SECRET` no coincide entre el Vault
   (`select decrypted_secret from vault.decrypted_secrets where name =
   'cron_secret';`) y el secreto de la Edge Function. Si no coinciden,
   la función responde 401 y el cron "corre" pero no hace nada.
5. **Mientras se arregla**: puedes disparar la publicación a mano
   llamando la Edge Function `programar-publicacion` directo desde el
   dashboard de Supabase (Edge Functions → Invoke), con el header
   `Authorization: Bearer <CRON_SECRET>`.

## 🟡 Se agotó el límite de correo (invitaciones/reset de contraseña no llegan)

Supabase sin SMTP propio tiene un límite bajo de correos por hora.

1. Espera 1 hora — el límite se resetea solo.
2. **Mientras tanto**, si necesitas dar de alta a un admin con urgencia:
   créalo manualmente desde Supabase Dashboard → Authentication → Users
   → Add user, y agrega su fila en `perfiles_admin` a mano por SQL Editor
   (evita `invitar-admin`, que depende del correo de invitación).
3. Solución permanente: configurar SMTP propio en Supabase → Authentication
   → Email Templates → SMTP Settings (pendiente, no configurado hoy).

---

**Contactos / accesos que vas a necesitar en cualquiera de estos casos:**
- Dashboard de Supabase: https://supabase.com/dashboard/project/xiqqhjdpmqdnzsvpjhwq
- Repo de GitHub: https://github.com/mecottl/privas-magazine
- `docs/SECRETS.md` — qué es cada secreto y dónde vive, si necesitas
  regenerar alguno en el proceso.