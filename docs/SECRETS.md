# Secretos requeridos (configurar a mano)

## Secretos de Edge Functions (Supabase)

Supabase → Project Settings → Edge Functions → Secrets, o `supabase secrets set`.
NO son secretos de GitHub Actions: es Supabase quien llama a GitHub, no al revés.

- `SUPABASE_SERVICE_ROLE_KEY` — inyectado automáticamente por Supabase.
- `UPLOAD_TARGET` — `supabase` (staging) | `sftp` (Hostinger).
- `SFTP_HOST` / `SFTP_USER` / `SFTP_PASSWORD` — subida a Hostinger.
- `RESEND_API_KEY` — envío de newsletter (cuando exista el dominio).
- `GH_DISPATCH_TOKEN` — PAT de GitHub con permiso `repo` (o fine-grained con
  Contents: read/write). Usado por `programar-publicacion` para disparar el
  rebuild vía `repository_dispatch`. NO puede llamarse `GITHUB_*` (prefijo
  reservado por GitHub) — además el consumidor aquí es Supabase.
- `GH_DISPATCH_REPO` — opcional, `owner/repo` destino. Default `mecottl/privas-magazine`.

## Secretos de GitHub Actions (repo → Settings → Secrets and variables → Actions)

Usados por `.github/workflows/`:

- `SUPABASE_ANON_KEY` — reemplaza `__SUPABASE_ANON_KEY__` en el bundle (deploy.yml).
- `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — deploy a Vercel (deploy.yml).
- `SUPABASE_ACCESS_TOKEN` — deploy de Edge Functions (supabase-functions.yml).

## pg_cron

```sql
select cron.schedule(
  'programar-publicacion',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://xiqqhjdpmqdnzsvpjhwq.functions.supabase.co/programar-publicacion',
       headers := '{"Authorization":"Bearer <service_role>"}'::jsonb
     ) $$
);
```
