# Secretos requeridos (configurar a mano)

## Secretos de Edge Functions (Supabase)

Supabase → Project Settings → Edge Functions → Secrets, o `supabase secrets set`.
NO son secretos de GitHub Actions: es Supabase quien llama a GitHub, no al revés.

| Secreto | Usado por | Notas |
| --- | --- | --- |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | todas | inyectados automáticamente por Supabase |
| `CRON_SECRET` | `programar-publicacion` | token compartido con la llamada de `pg_cron`; la función responde 401 si no coincide |
| `GH_DISPATCH_TOKEN` | `programar-publicacion` | PAT de GitHub con permiso de `repository_dispatch` sobre el repo. NO puede llamarse `GITHUB_*` (prefijo reservado) |
| `GH_DISPATCH_REPO` | `programar-publicacion` | opcional, `owner/repo`. Default `mecottl/privas-magazine` |
| `RESEND_API_KEY` | `programar-publicacion` | opcional hoy (sin dominio). Si falta, el envío de newsletter se salta silenciosamente |
| `RESEND_AUDIENCE_ID` / `NEWSLETTER_FROM` | `programar-publicacion` | audiencia de Resend "marketing" y remitente |
| `SITE_URL` | `programar-publicacion` | base pública para armar links (default `https://privasmagazine.com`) |
| `UPLOAD_TARGET` | `subir-archivo` | `supabase` (staging, ya disponible) \| `sftp` (Hostinger) |
| `UPLOAD_BUCKET` | `subir-archivo` | bucket privado de Storage (default `uploads`) |
| `SFTP_HOST` / `SFTP_USER` / `SFTP_PASSWORD` | `subir-archivo` | solo para `UPLOAD_TARGET=sftp` |
| `SFTP_PUBLIC_BASE_URL` | `subir-archivo` | dominio público de Hostinger, ej. `https://privasmagazine.com` |

## Secretos de GitHub Actions (repo → Settings → Secrets and variables → Actions)

Usados por `.github/workflows/`:

- `SUPABASE_ANON_KEY` — reemplaza `__SUPABASE_ANON_KEY__` en el bundle (deploy.yml).
- `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — deploy a Vercel (deploy.yml).
- `SUPABASE_ACCESS_TOKEN` — deploy de Edge Functions (supabase-functions.yml).

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
- **`subir-archivo`**: probar con `UPLOAD_TARGET=supabase` (hoy). La rama SFTP no se puede probar hasta que exista Hostinger.
- **`confirmar-suscripcion` / `cancelar-suscripcion`**: probables de punta a punta ya.
  Sin `RESEND_API_KEY` no se puede enviar el correo con el link, así que:
  1. `insert into suscriptores_newsletter (email) values ('prueba@ejemplo.com');`
  2. copiar su `token_confirmacion`
  3. `POST .../confirmar-suscripcion` con `{ "token": "<token>" }` o `?token=<token>`
