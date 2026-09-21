# Secretos requeridos (configurar a mano)

> **4 sep 2026**: Hostinger se reemplazó por Akky. Akky confirmó que NO tiene
> SFTP, solo FTP plano vía cPanel — todos los secretos de subida de archivos
> se renombraron de `SFTP_*` a `FTP_*` (el código también se migró, de
> `ssh2-sftp-client` a `basic-ftp`).
>
> **Confirmado en vivo (19 sep 2026)**: la cuenta FTP de Akky apunta directo
> a la raíz pública del dominio — a diferencia de Hostinger, NO usa la
> convención `public_html/`. Ver `FTP_REMOTE_PREFIX` abajo (vacío por
> default) e issue #55.

## Secretos de Edge Functions (Supabase)

Supabase → Project Settings → Edge Functions → Secrets, o `supabase secrets set`.
NO son secretos de GitHub Actions: es Supabase quien llama a GitHub, no al revés.

| Secreto | Usado por | Notas |
| --- | --- | --- |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | todas | inyectados automáticamente por Supabase |
| `CRON_SECRET` | `programar-publicacion`, `eliminar-archivo` | token compartido con las llamadas de `pg_cron` / triggers de BD (`pg_net`); la función responde 401 si no coincide. En el Vault de Postgres debe existir como `cron_secret` con el MISMO valor |
| `UPLOAD_TARGET` | `subir-archivo` | `supabase` (staging, ya disponible) \| `ftp` (Akky) |
| `UPLOAD_BUCKET` | `subir-archivo`, `eliminar-archivo` | bucket privado de Storage (default `uploads`) — solo aplica cuando el target es `supabase` |
| `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` | `subir-archivo`, `eliminar-archivo` | credenciales de la cuenta FTP en cPanel de Akky. Solo para `UPLOAD_TARGET=ftp`. La función intenta FTPS explícito primero y cae a FTP sin cifrar si el servidor lo rechaza |
| `FTP_PUBLIC_BASE_URL` | `subir-archivo` | dominio público de Akky, ej. `https://privasmagazine.com` |
| `FTP_REMOTE_PREFIX` | `subir-archivo`, `eliminar-archivo` | opcional, **default vacío**. La cuenta FTP de Akky ya apunta a la raíz pública del dominio — NO usar `public_html` aquí (se confirmó en vivo, issue #55, que esa carpeta no es la raíz servida). Solo se necesita si algún día se usa una cuenta FTP con la convención estándar de cPanel (home = `.../public_html/`) |
| `GH_DISPATCH_TOKEN` | `programar-publicacion` | PAT de GitHub con permiso de `repository_dispatch` sobre el repo. NO puede llamarse `GITHUB_*` (prefijo reservado) |
| `GH_DISPATCH_REPO` | `programar-publicacion` | opcional, `owner/repo`. Default `mecottl/privas-magazine` |
| `RESEND_API_KEY` | `programar-publicacion`, `mfa-enviar-codigo` | ya configurado (dominio verificado, SMTP de Auth también usa Resend). En `programar-publicacion` sigue siendo tolerante: si faltara, el envío de newsletter se salta silencioso. En `mfa-enviar-codigo` es obligatorio — sin correo no hay forma de verificar el código |
| `RESEND_AUDIENCE_ID` / `NEWSLETTER_FROM` | `programar-publicacion` | audiencia de Resend "marketing" y remitente |
| `MFA_EMAIL_FROM` | `mfa-enviar-codigo` | opcional, default `PRIVAS Magazine <contacto@privasmagazine.com>` |
| `SITE_URL` | `programar-publicacion`, `invitar-admin` | base pública para armar links (default `https://privasmagazine.com`). `invitar-admin` la usa para el `redirectTo` del correo de invitación — **esa URL completa (`SITE_URL/gestion-privas/aceptar-invitacion`) debe estar en Supabase → Authentication → URL Configuration → Redirect URLs**, o Supabase la ignora en silencio (issue #61) |

## Rate limiting (issue #15)

`suscribirse`, `confirmar-suscripcion` y `cancelar-suscripcion` no usan
secretos nuevos — cuentan sus propios intentos en la tabla
`intentos_publicos` (RLS sin policies públicas, solo `service_role`) vía
`_shared/rate_limit.ts`. No hace falta configurar nada para que funcione.

## Secretos de GitHub Actions (repo → Settings → Secrets and variables → Actions)

Usados por `.github/workflows/`:

- `SUPABASE_ANON_KEY` — reemplaza `__SUPABASE_ANON_KEY__` en el bundle (deploy.yml).
- ~~`VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`~~ — eliminados el 20 sep 2026 (issue #59). Vercel ya no forma parte del pipeline; `deploy.yml` solo publica a Akky.
- `SUPABASE_ACCESS_TOKEN` — deploy de Edge Functions (supabase-functions.yml) y backup mensual (backup-db.yml).
- `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` — deploy del sitio completo a Akky (deploy.yml, step "Deploy a Akky por FTP", issue #19). **Secretos de GitHub Actions, no confundir con los del mismo nombre en Supabase Edge Functions** (docs/SECRETS.md arriba) — viven en dos lugares distintos aunque el valor sea el mismo (misma cuenta FTP `privasmagazine-ftp@privasmagazine.com`). Configúralos en el repo: Settings → Secrets and variables → Actions.

## pg_cron → programar-publicacion

`net.http_post` manda el `CRON_SECRET` en el header Authorization (NO el service_role):

```sql
select cron.schedule(
  'programar-publicacion',
  '*/15 * * * *',
  $$ select net.http_post(
       url     := 'https://xiqqhjdpmqdnzsvpjhwq.functions.supabase.co/programar-publicacion',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || '<CRON_SECRET>'
       )
     ) $$
);
```

## Cómo probar (ver brief "Nota general sobre pruebas")

- **`invitar-admin`**: usar una segunda cuenta real (prueba o de la clienta), no la del dev.
- **`subir-archivo` / `eliminar-archivo`**: rama FTP ya probada en vivo contra Akky. Si la URL pública devuelta da 404, lo primero a revisar es `FTP_REMOTE_PREFIX` (debe estar vacío salvo que la cuenta FTP use la convención `public_html/`).
- **`confirmar-suscripcion` / `cancelar-suscripcion`**: probables de punta a punta ya.
  Sin `RESEND_API_KEY` no se puede enviar el correo con el link, así que:
  1. `insert into suscriptores_newsletter (email) values ('prueba@ejemplo.com');`
  2. copiar su `token_confirmacion`
  3. `POST .../confirmar-suscripcion` con `{ "token": "<token>" }` o `?token=<token>`
