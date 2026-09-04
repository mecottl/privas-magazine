# Secretos requeridos (configurar a mano)

> **4 sep 2026**: Hostinger se reemplazó por Akky. Akky confirmó que NO tiene
> SFTP, solo FTP plano vía cPanel — todos los secretos de subida de archivos
> se renombraron de `SFTP_*` a `FTP_*` (el código también se migró, de
> `ssh2-sftp-client` a `basic-ftp`).
>
> **Pendiente de confirmar con Akky**: el nombre exacto de la ruta de
> cuentas FTP dentro de cPanel (equivalente a lo que en Hostinger era
> hPanel → Archivos → Cuentas FTP).

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
| `GH_DISPATCH_TOKEN` | `programar-publicacion` | PAT de GitHub con permiso de `repository_dispatch` sobre el repo. NO puede llamarse `GITHUB_*` (prefijo reservado) |
| `GH_DISPATCH_REPO` | `programar-publicacion` | opcional, `owner/repo`. Default `mecottl/privas-magazine` |
| `RESEND_API_KEY` | `programar-publicacion` | opcional hoy (sin dominio). Si falta, el envío de newsletter se salta silenciosamente |
| `RESEND_AUDIENCE_ID` / `NEWSLETTER_FROM` | `programar-publicacion` | audiencia de Resend "marketing" y remitente |
| `SITE_URL` | `programar-publicacion` | base pública para armar links (default `https://privasmagazine.com`) |

## Secretos de GitHub Actions (repo → Settings → Secrets and variables → Actions)

Usados por `.github/workflows/`:

- `SUPABASE_ANON_KEY` — reemplaza `__SUPABASE_ANON_KEY__` en el bundle (deploy.yml).
- `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — deploy a Vercel (deploy.yml, staging temporal). **Se eliminan por completo al migrar a Akky**, no se transfieren ni se reutilizan.
- `SUPABASE_ACCESS_TOKEN` — deploy de Edge Functions (supabase-functions.yml).
- *(Pendiente de agregar cuando exista la cuenta de Akky)*: credenciales para que `deploy.yml` suba por FTP en vez de a Vercel — ver issue de migración de despliegue en GitHub Issues.

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
- **`subir-archivo` / `eliminar-archivo`**: probar con `UPLOAD_TARGET=supabase` (hoy). La rama FTP no se puede probar en vivo hasta tener credenciales reales de Akky.
- **`confirmar-suscripcion` / `cancelar-suscripcion`**: probables de punta a punta ya.
  Sin `RESEND_API_KEY` no se puede enviar el correo con el link, así que:
  1. `insert into suscriptores_newsletter (email) values ('prueba@ejemplo.com');`
  2. copiar su `token_confirmacion`
  3. `POST .../confirmar-suscripcion` con `{ "token": "<token>" }` o `?token=<token>`
