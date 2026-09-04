# Brief: lógica real de las Edge Functions

Las **7 funciones** viven en `supabase/functions/`. Este documento detalla la
lógica real de cada una. Léelo junto con `CLAUDE.md` — no repite el contexto
general, solo añade el detalle de implementación.

> **4 sep 2026**: Hostinger → Akky. Akky no tiene SFTP, solo FTP plano vía
> cPanel. `subir-archivo` y `eliminar-archivo` se migraron de
> `ssh2-sftp-client` (SFTP real, cifrado) a `basic-ftp` (FTP, con intento de
> FTPS explícito primero y caída a FTP plano si el servidor lo rechaza).

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
   `UPLOAD_TARGET=supabase` (límite real ~50 MB de Storage), 60 MB con `ftp`.
4. Nombre seguro y único: `slug-timestamp.ext` (nunca el nombre original).
5. Según `UPLOAD_TARGET`:
   - `supabase` → bucket privado con `service_role`, devolver URL firmada
     de larga expiración.
   - `ftp` → `FTP_HOST/USER/PASSWORD`, sube a `public_html/uploads/...` en
     cPanel de Akky. Intenta conectar con FTPS explícito (`secure: true`)
     primero; si el servidor lo rechaza, reintenta en FTP plano
     (`secure: false`) — Akky confirmó que no tiene SFTP.
6. 200 con `{ url }` — el frontend la guarda en la fila correspondiente.

## 4. `eliminar-archivo`

Quién la llama: los triggers de base de datos `articulos_limpiar_portada` y
`ediciones_limpiar_archivos` vía `pg_net` — NUNCA el frontend directo. Se
dispara automáticamente cuando se reemplaza o borra un artículo/edición, para
no dejar archivos huérfanos en Storage o en Akky.

1. Validar `CRON_SECRET` (mismo secreto que `programar-publicacion`, vía
   `requireCronSecret()`) — si no coincide, 401. Así no es invocable
   públicamente aunque la URL sea pública.
2. Body: `{ path, target }` o `{ archivos: [{ path, target }, ...] }` (PDF +
   portada de una edición en una sola llamada).
3. Por cada archivo, según `target`:
   - `supabase` → `storage.from(bucket).remove([path])` con `service_role`.
     `UPLOAD_BUCKET` define el bucket (default `uploads`).
   - `ftp` → conecta a Akky igual que `subir-archivo` (FTPS primero, FTP
     plano si falla) y usa `removeQuiet()` (no lanza error si el archivo ya
     no existe — a diferencia de `remove()`).
4. Si un archivo individual falla, NO tumba la respuesta completa: se
   registra en `console.error` y se sigue con el resto del lote.
5. 200 con `{ ok: true, resultados: [{ path, target, ok, error? }, ...] }`.

Secretos: `CRON_SECRET`, `UPLOAD_BUCKET`, `FTP_HOST` / `FTP_USER` /
`FTP_PASSWORD` (solo rama `ftp`).

## 5. `confirmar-suscripcion`

Pública, vía el link del correo de confirmación.

1. Recibir `token` (query param o body).
2. Con `service_role`: buscar la fila con ese `token_confirmacion`.
3. Si no existe → respuesta genérica ("enlace inválido o ya usado"), sin
   confirmar ni negar la existencia de un email.
4. Si existe → `update ... set activo = true`.
5. Respuesta genérica de éxito. El mensaje visible lo pinta Angular en
   `/newsletter/confirmar`.

## 6. `cancelar-suscripcion`

Igual que la 4, pero `activo = false`. NO borra la fila (respeta la baja aunque
reintenten confirmar con un token viejo).

## 7. `set-admin-activo`

Quién la llama: un admin logueado, desde la pantalla de Administradores.

Existe porque la RLS de `perfiles_admin` para UPDATE es `id = auth.uid()` (un
admin solo puede editar su propia fila), así que activar/desactivar a OTRO admin
es imposible desde el cliente. Se hace aquí con `service_role`.

1. `requireAdmin` (admin activo).
2. Body: `{ id: uuid, activo: boolean }`.
3. Candado: `id === quienLlama.id && activo === false` → 400 (no puedes
   desactivarte a ti mismo y dejarte fuera).
4. Candado: si `activo === false` y solo queda 1 admin activo → 400.
5. `update perfiles_admin set activo = <activo> where id = <id>` con
   `service_role`; devuelve la fila afectada.

## Nota general sobre pruebas

- `invitar-admin`: probar con una segunda cuenta real, no la del dev.
- `subir-archivo` / `eliminar-archivo`: probar con `UPLOAD_TARGET=supabase`
  (hoy). La rama `ftp` no se puede probar en vivo hasta tener credenciales
  reales de Akky.
- `confirmar/cancelar-suscripcion`: probables de punta a punta ya. Sin
  `RESEND_API_KEY` no hay correo real: insertar un registro de prueba directo en
  `suscriptores_newsletter` vía SQL, tomar su `token_confirmacion` y llamar la
  función manualmente.
