# Brief: lógica real de las Edge Functions

Las 5 funciones viven en `supabase/functions/`. Este documento detalla la
lógica real de cada una. Léelo junto con `CLAUDE.md` — no repite el contexto
general, solo añade el detalle de implementación.

## Regla transversal de seguridad — aplica a TODAS

Cualquier Edge Function es una URL pública. Que use `service_role` para saltarse
RLS no significa que cualquiera pueda llamarla — cada función valida por su
cuenta quién la llama, antes de hacer nada.

- **Solo admin logueado** (`invitar-admin`, `subir-archivo`): leer el JWT del
  header `Authorization`, verificar el usuario contra Auth y confirmar que
  existe en `perfiles_admin` con `activo = true` (mismo criterio que
  `is_admin()` en SQL, repetido aquí porque corre con `service_role`).
  → `requireAdmin()` en `_shared/clients.ts`.
- **Solo el sistema** (`programar-publicacion`): validar
  `Authorization: Bearer <CRON_SECRET>` contra la variable de entorno. Si no
  coincide → 401. → `requireCronSecret()` en `_shared/clients.ts`.
- **Públicas por diseño** (`confirmar-suscripcion`, `cancelar-suscripcion`): no
  requieren sesión, pero SÍ el token correcto en la URL/body — sin token
  válido, no hacen nada. Respuesta SIEMPRE genérica (no revelan si un email
  está suscrito).

## 1. `programar-publicacion`

Quién la llama: `pg_cron` cada 15 min, autenticado con `CRON_SECRET`.

1. Validar `CRON_SECRET`. Si falla → 401 y salir.
2. Con `service_role`: `update articulos/ediciones_revista set estado='publicado'
   where estado='programado' and fecha_publicacion <= now() returning id`.
3. Si el total de filas afectadas > 0:
   - `repository_dispatch` a GitHub (`event_type: rebuild-sitio`) con
     `GH_DISPATCH_TOKEN`.
   - Newsletter vía Resend "marketing", detrás de un check de `RESEND_API_KEY`
     y su propio `try/catch` (si falta la key, saltar silenciosamente).
4. 200 con un resumen (cuántos artículos/ediciones se publicaron).

## 2. `invitar-admin`

Quién la llama: un admin ya logueado, desde el panel.

1. `requireAdmin` (admin activo).
2. Body: `email`, `nombre_visible`, `nivel_permiso`.
3. Validar `nivel_permiso` contra el CHECK (hoy solo `'admin_total'`); si no
   → 400 con mensaje claro.
4. Con `service_role`: `auth.admin.inviteUserByEmail(email)` (crea el usuario y
   manda el correo de invitación de Supabase) + insert en `perfiles_admin`
   `{ id, nombre_visible, nivel_permiso, activo: true }`.
5. Si el insert falla tras crear el usuario → rollback `auth.admin.deleteUser()`.
6. 200 con los datos del nuevo admin (sin nada sensible).

## 3. `subir-archivo`

Quién la llama: un admin logueado, desde el panel.

1. `requireAdmin`.
2. `multipart/form-data`: `archivo` + `tipo`
   (`articulo-portada` | `revista-pdf` | `revista-portada`).
3. Validar tamaño según el tipo antes de subir. `revista-pdf`: 45 MB con
   `UPLOAD_TARGET=supabase` (límite real ~50 MB de Storage), 60 MB con `sftp`.
4. Nombre seguro y único: `slug-timestamp.ext` (nunca el nombre original).
5. Según `UPLOAD_TARGET`:
   - `supabase` → bucket privado con `service_role`, devolver URL firmada
     de larga expiración.
   - `sftp` → `SFTP_HOST/USER/PASSWORD`, subir a `public_html/uploads/...`,
     devolver la URL pública final.
6. 200 con `{ url }` — el frontend la guarda en la fila correspondiente.

## 4. `confirmar-suscripcion`

Pública, vía el link del correo de confirmación.

1. Recibir `token` (query param o body).
2. Con `service_role`: buscar la fila con ese `token_confirmacion`.
3. Si no existe → respuesta genérica ("enlace inválido o ya usado"), sin
   confirmar ni negar la existencia de un email.
4. Si existe → `update ... set activo = true`.
5. Respuesta genérica de éxito. El mensaje visible lo pinta Angular en
   `/newsletter/confirmar`.

## 5. `cancelar-suscripcion`

Igual que la 4, pero `activo = false`. NO borra la fila (respeta la baja aunque
reintenten confirmar con un token viejo).

## Nota general sobre pruebas

- `invitar-admin`: probar con una segunda cuenta real, no la del dev.
- `subir-archivo`: probar con `UPLOAD_TARGET=supabase` (hoy). La rama SFTP no se
  puede probar hasta que exista Hostinger.
- `confirmar/cancelar-suscripcion`: probables de punta a punta ya. Sin
  `RESEND_API_KEY` no hay correo real: insertar un registro de prueba directo en
  `suscriptores_newsletter` vía SQL, tomar su `token_confirmacion` y llamar la
  función manualmente.
