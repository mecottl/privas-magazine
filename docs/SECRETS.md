# Supabase secrets requeridos (configurar a mano en el dashboard)

## Edge Functions
- SUPABASE_SERVICE_ROLE_KEY (auto)
- UPLOAD_TARGET = supabase | sftp
- SFTP_HOST / SFTP_USER / SFTP_PASSWORD
- RESEND_API_KEY
- GITHUB_DISPATCH_TOKEN (repo dispatch para rebuild)

## pg_cron
select cron.schedule('programar-publicacion','*/15 * * * *', $$ select net.http_post(url:='https://xiqqhjdpmqdnzsvpjhwq.functions.supabase.co/programar-publicacion', headers:='{"Authorization":"Bearer <service_role>"}'::jsonb) $$);
