# Cómo restaurar el backup mensual (issue #79)

> **Sin probar en vivo todavía.** Este documento describe el procedimiento
> tal como se desprende de leer `backup-db.yml` y la documentación de
> Supabase — no se ha hecho un restore real (implica crear un proyecto
> nuevo de Supabase, que puede tener costo, y se decidió no hacerlo sin
> confirmar contigo primero). Antes de confiar en esto para una emergencia
> real, sigue estos pasos una vez con calma y anota cualquier diferencia.

## Qué SÍ trae el backup

`backup-db.yml` corre el día 1 de cada mes (o manual, `workflow_dispatch`)
y sube como **artifact** del run (GitHub los borra a los 90 días — no es
almacenamiento permanente, hay que bajarlos si se quieren guardar más
tiempo):

- `esquema-<fecha>.sql` — `supabase db dump --linked` (tablas, funciones,
  triggers, policies de RLS, todo el DDL).
- `datos-<fecha>.sql` — `supabase db dump --linked --data-only` (el
  contenido real de las tablas).

## Qué NO trae el backup (hay que reconstruirlo aparte)

El dump es solo de Postgres. Esto vive fuera de la base de datos y no está
en ningún artifact:

- **Storage de Supabase** — cualquier archivo subido con `UPLOAD_TARGET=supabase`
  (hoy la mayoría vive en Akky por FTP, no aquí, pero revisar `*_target`
  en `articulos`/`ediciones_revista` fila por fila si hace falta un
  restore real).
- **Código de las Edge Functions** — vive en este repo (`supabase/functions/`),
  no en la base de datos. Se redepliega con
  `supabase functions deploy --project-ref <nuevo-ref>` (o dejando que
  `supabase-functions.yml` lo haga solo si se apunta a un proyecto nuevo).
- **Secretos de Edge Functions** (`RESEND_API_KEY`, `FTP_*`, `CRON_SECRET`,
  etc.) — hay que volver a configurarlos a mano en el proyecto nuevo. Lista
  completa en `docs/SECRETS.md`.
- **Configuración de Auth** — proveedor de email/SMTP, plantillas de correo
  (`docs/email-invitacion.html` se pega a mano en el dashboard), Redirect
  URLs (`SITE_URL/gestion-privas/aceptar-invitacion`, ver issue #61).
- **`pg_cron` / Vault** — el job de `programar-publicacion` (`cron.schedule`,
  ver `docs/SECRETS.md` § *pg_cron*) y el secreto `cron_secret` en el Vault
  de Postgres normalmente NO vienen en un `pg_dump` por defecto porque
  viven en el schema de la extensión `pg_cron`/`vault`, no en `public`.
  **Confirmar esto en la primera prueba real** — si el dump no los trae,
  hay que volver a correr el `select cron.schedule(...)` de `docs/SECRETS.md`
  a mano.
- **Extensiones activas** (`pg_cron`, `pg_net`, etc.) — activarlas de nuevo
  en el proyecto nuevo antes de aplicar el dump, si el dump no las trae.

## Procedimiento de restore (probar en un proyecto aparte, NUNCA en el real)

1. **Crear un proyecto nuevo de Supabase** — dashboard o
   `create_project` por MCP. Revisar el costo con el desarrollador antes
   de crearlo (confirmar plan/org). **Nunca reutilizar ni tocar el
   proyecto real (`xiqqhjdpmqdnzsvpjhwq`) ni `privastravel`.**
2. **Activar extensiones** que use el proyecto real (`pg_cron`, `pg_net`,
   `pgcrypto` para `gen_random_uuid()`, etc.) — Dashboard → Database →
   Extensions, antes de aplicar el dump.
3. **Bajar el backup más reciente**: GitHub → pestaña Actions → workflow
   "Backup mensual de la base de datos" → el run más reciente → artifact
   `backup-db-<run_id>` → descomprimir.
4. **Aplicar el esquema primero, los datos después** (el orden importa —
   los datos necesitan que las tablas ya existan):
   ```bash
   psql "postgresql://postgres:<password>@<host>:5432/postgres" -f esquema-<fecha>.sql
   psql "postgresql://postgres:<password>@<host>:5432/postgres" -f datos-<fecha>.sql
   ```
   (La cadena de conexión del proyecto nuevo está en Dashboard → Project
   Settings → Database.)
5. **Verificar** que las tablas clave tengan filas reales: `articulos`,
   `perfiles_admin`, `categorias`, `marcas`, `suscriptores_newsletter`.
6. **Redesplegar las Edge Functions** contra el proyecto nuevo y volver a
   configurar sus secretos (ver "Qué NO trae el backup" arriba).
7. **Apuntar el frontend** (`environment.ts` o una copia local) al proyecto
   nuevo para probar que el sitio de verdad carga contenido desde ahí.
8. Cuando termine la prueba: **pausar o eliminar el proyecto temporal**
   para no dejarlo corriendo cobrando de más.

## Si esto es una emergencia real (no una prueba)

Si el proyecto real (`xiqqhjdpmqdnzsvpjhwq`) se perdió de verdad:

1. Sigue los pasos de arriba pero contra un proyecto nuevo que SÍ va a ser
   el reemplazo definitivo.
2. Actualiza `SUPABASE_URL`/`SUPABASE_ANON_KEY` en `environment.ts` y en
   los secretos de GitHub Actions al nuevo proyecto.
3. Actualiza el `ref` del proyecto en todos los comandos de este repo que
   lo mencionan a mano (`CLAUDE.md`, `docs/SECRETS.md`, este archivo).
4. Redespliega el frontend (push a `main` ya dispara `deploy.yml`).
