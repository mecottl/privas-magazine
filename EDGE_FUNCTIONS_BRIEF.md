# Brief: lógica real de las Edge Functions

Las **13 funciones** viven en `supabase/functions/`. Este documento detalla la
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
- **Públicas por diseño** (`suscribirse`, `confirmar-suscripcion`,
  `cancelar-suscripcion`): no requieren sesión. `confirmar`/`cancelar` exigen
  el token correcto en la URL/body — sin token válido, no hacen nada.
  Respuesta SIEMPRE genérica (no revelan si un email está suscrito). Las 3
  aplican rate limiting por IP (`_shared/rate_limit.ts`, issue #15) para que
  un endpoint sin sesión no sea spameable ni fuerza-bruteable sin límite.

## 1. `programar-publicacion`

Quién la llama: `pg_cron` cada 15 min, autenticado con `CRON_SECRET`.

1. Validar `CRON_SECRET`. Si falla → 401 y salir.
2. Con `service_role`: `update articulos/ediciones_revista set estado='publicado'
   where estado='programado' and fecha_publicacion <= now() returning id`.
3. Si el total de filas afectadas > 0:
   - `repository_dispatch` a GitHub (`event_type: rebuild-sitio`) con
     `GH_DISPATCH_TOKEN`.
   - Newsletter vía Resend "marketing" (broadcast a `RESEND_AUDIENCE_ID`),
     detrás de un check de `RESEND_API_KEY` y su propio `try/catch` (si falta
     la key, saltar silenciosamente). El link de baja usa el merge tag nativo
     `{{{RESEND_UNSUBSCRIBE_URL}}}` (issue #64) — un broadcast a toda la
     audiencia no puede llevar un link con nuestro propio token por
     destinatario, así que la baja por ese link la gestiona Resend en su
     audiencia (no actualiza `suscriptores_newsletter.activo`; para eso está
     nuestro propio flujo de `cancelar-suscripcion`).
4. Purga la papelera (issue #77): `delete ... where eliminado_en is not null
   and eliminado_en <= now() - 30 días` en `articulos` y `ediciones_revista`.
   Reutiliza este mismo cron de 15 min — no hay un `pg_cron` nuevo para esto.
   El DELETE real dispara igual la limpieza de archivos huérfanos que ya
   existía (trigger → `eliminar-archivo`), sin cambios ahí.
5. Heartbeat externo (issue #78): si `HEALTHCHECK_URL` existe, le pega al
   terminar (`/fail` si el paso 2 dio error). Si el ping no llega a tiempo
   (pg_cron dejó de correr, o la función empezó a fallar), la alerta la
   manda el propio servicio externo (healthchecks.io o similar) — no hay
   monitoreo propio construido para esto a propósito.
6. 200 con un resumen (cuántos artículos/ediciones se publicaron y purgaron).

## 2. `invitar-admin`

Quién la llama: un admin **`dueno` o `admin_total`** ya logueado, desde el
panel — un `editor` no puede invitar a nadie.

1. `requireAdmin` + chequeo manual: si `nivel_permiso === 'editor'` → 403.
2. Body: `email`, `nombre_visible`, `nivel_permiso`.
3. Validar `nivel_permiso` contra el CHECK (`'dueno'` | `'admin_total'` |
   `'editor'`); si no → 400. Además, si quien llama es `admin_total` (no
   `dueno`) y pide un `nivel_permiso` distinto de `'editor'` → 403 — un
   `admin_total` solo puede invitar editores, invitar `dueno`/`admin_total`
   es exclusivo del `dueno`.
4. Con `service_role`: `auth.admin.inviteUserByEmail(email, { redirectTo, data })`
   (crea el usuario y manda el correo de invitación de Supabase) + insert en
   `perfiles_admin` `{ id, nombre_visible, nivel_permiso, activo: true }`.
   - `redirectTo` = `SITE_URL` + `/gestion-privas/aceptar-invitacion` — la
     pantalla (issue #61) donde la persona invitada pone su contraseña; sin
     esto Supabase la manda a una página propia sin marca. **Esa URL debe
     estar en Supabase → Authentication → URL Configuration → Redirect URLs**,
     si no Supabase la ignora en silencio.
   - `data: { nivel_permiso, nombre_visible }` — queda disponible en la
     plantilla del correo como `{{ .Data.nivel_permiso }}`, para mostrar
     texto distinto según el rol invitado (ver `docs/email-invitacion.html`).
5. Si el insert falla tras crear el usuario → rollback `auth.admin.deleteUser()`.
6. 200 con los datos del nuevo admin (sin nada sensible).

Plantilla del correo: personalizada con la marca de PRIVAS y texto por rol
(admin_total/editor) — ver `docs/email-invitacion.html`, se pega en
Authentication → Emails → Invite user → Source (requiere SMTP propio
configurado para poder editarla, ver docs/SECRETS.md).

El link del correo NO apunta directo a `{{ .ConfirmationURL }}`: pasa primero
por `/gestion-privas/confirmar-invitacion?siguiente=...`, una pantalla propia
que no hace ninguna petición y solo espera un clic. Se confirmó en vivo que
algunos webmails (Roundcube/cPanel) generan una vista previa automática del
link al abrir el correo — como el link de Supabase es de un solo uso, esa
previsualización lo quema antes de que la persona le dé clic de verdad
("Enlace inválido o vencido" sin haber hecho nada). Un previsualizador
automático solo llega al interstitial (inofensivo); la URL real de Supabase
solo se toca con un clic humano.

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
   - `ftp` → `FTP_HOST/USER/PASSWORD`, sube a `<FTP_REMOTE_PREFIX>uploads/...`
     en cPanel de Akky — `FTP_REMOTE_PREFIX` vacío por default, **no** es
     `public_html/`: se confirmó en vivo (issue #55) que la cuenta FTP de
     Akky ya apunta directo a la raíz pública del dominio, sin la carpeta
     `public_html/` de la convención estándar de cPanel. Intenta conectar
     con FTPS explícito (`secure: true`) primero; si el servidor lo rechaza,
     reintenta en FTP plano (`secure: false`) — Akky confirmó que no tiene
     SFTP.
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
`FTP_PASSWORD` / `FTP_REMOTE_PREFIX` (solo rama `ftp`, debe coincidir con el
de `subir-archivo` o se intenta borrar en el lugar equivocado).

## 5. `suscribirse`

Pública, vía el formulario de newsletter del sitio. Reemplaza el INSERT
directo del frontend a `suscriptores_newsletter` — esa policy pública se
cerró (migración `20260905000000_cerrar_insert_publico_newsletter.sql`)
precisamente para poder validar y limitar aquí antes de escribir (issue #15).

1. Rate limit: `dentroDelLimite('suscribirse', ipDeRequest(req), 5, 10)` — 5
   intentos por IP cada 10 min. Si excede → 429.
2. Body: `{ email }`. Validar formato con una regex simple; si no matchea →
   400.
3. Con `service_role`: `insert` en `suscriptores_newsletter`, pidiendo de
   vuelta `token_confirmacion`.
4. Si `error.code === '23505'` (email duplicado, columna `unique`) → 409
   "Ese correo ya está registrado.". Otro error → 500.
5. Manda el correo de confirmación por Resend con el link a
   `/newsletter/confirmar?token=...` (issue #64 — antes esto no pasaba y
   nadie podía completar el doble opt-in). Tolerante: si `RESEND_API_KEY`
   falta, solo loguea, no tumba la función.
6. 200 `{ ok: true }`.

## 6. `confirmar-suscripcion`

Pública, vía el link del correo de confirmación.

1. Rate limit: `dentroDelLimite('confirmar-suscripcion', ipDeRequest(req), 10, 15)`
   — 10 intentos por IP cada 15 min (frena fuerza bruta de tokens). Si excede
   → 429.
2. Recibir `token` (query param o body).
3. Con `service_role`: buscar la fila con ese `token_confirmacion`.
4. Si no existe → respuesta genérica ("enlace inválido o ya usado"), sin
   confirmar ni negar la existencia de un email.
5. Si existe → `update ... set activo = true`, y sincroniza el contacto en la
   audiencia de Resend (`_shared/resend_audience.ts`, issue #64) para que el
   broadcast de `programar-publicacion` de verdad le llegue.
6. Respuesta genérica de éxito. El mensaje visible lo pinta Angular en
   `/newsletter/confirmar`.

## 7. `cancelar-suscripcion`

Igual que `confirmar-suscripcion`, pero `activo = false` y su propio cupo de
rate limit (misma función `actualizarEstadoSuscripcion`, ruta
`'cancelar-suscripcion'` — no comparte cupo con confirmar). NO borra la fila
(respeta la baja aunque reintenten confirmar con un token viejo). También
marca al contacto como `unsubscribed` en la audiencia de Resend.

## 8. `set-admin-activo`

Quién la llama: un admin **`dueno` o `admin_total`** logueado, desde la
pantalla de Administradores — un `editor` no puede llamarla (esa pantalla
ni siquiera carga para él, ver `gestionAdminsGuard`). A pesar del nombre
(histórico), hoy cubre cuatro acciones — se mantiene un solo archivo en vez
de cuatro funciones casi idénticas.

Existe porque la RLS de `perfiles_admin` para UPDATE es `id = auth.uid()`
(y solo permite tocar la columna `nombre_visible`, ver migración
`restringir_autoedicion_y_borrado_admin`), así que gestionar a OTRO admin
es imposible desde el cliente. Se hace aquí con `service_role`.

Matriz de permisos (poder absoluto es solo del `dueno`):
- `admin_total`: solo activa/desactiva/elimina cuentas cuyo `nivel_permiso`
  sea `editor` — nunca cambia `nivel_permiso` ni restablece contraseñas
  ajenas, ni toca cuentas `admin_total`/`dueno`.
- `dueno`: cualquier acción, sobre cualquier cuenta.

1. `requireAdmin` + chequeo manual del nivel de quien llama.
2. Body: `{ id: uuid, activo?: boolean, nivel_permiso?, password?, eliminar?: true }`.
   `nivel_permiso`/`password` → 403 si quien llama no es `dueno`.
3. Si quien llama no es `dueno`, exige que la cuenta objetivo sea `editor`
   → 403 si no.
4. Candados: nadie se desactiva/elimina a sí mismo; nunca puede quedar el
   sistema sin ningún admin activo, sin ningún `admin_total` activo, ni sin
   ningún `dueno` activo (al desactivar, degradar de nivel, o eliminar).
5. `eliminar` → `auth.admin.deleteUser(id)` (cascada a `perfiles_admin`,
   los artículos de esa cuenta quedan con `creado_por = null`). `password`
   → `auth.admin.updateUserById(id, { password })`. El resto → `update
   perfiles_admin` con los campos que vinieron en el body.

## 9. `mfa-enviar-codigo`

Quién la llama: cualquier admin logueado, desde
`/gestion-privas/verificar-mfa` (issue #17). MFA **propio por correo**, no
el TOTP nativo de Supabase — se decidió así para que no sea tedioso para
`dueno` (sin apps de autenticador ni QR) y porque permite "recordar este
dispositivo" un tiempo, algo que el MFA nativo de Supabase no soporta.

1. `requireAdmin`.
2. Invalida (`usado = true`) cualquier código previo sin usar de esa cuenta.
3. Genera un código de 6 dígitos, vence en 10 min, se guarda en
   `mfa_codigos` con `service_role`.
4. Lo manda por correo con la API de Resend directo (`POST
   https://api.resend.com/emails`) — NO vía Supabase Auth, este no es un
   correo de su sistema de invitación/recuperación.
5. 200 `{ ok: true }`. Si falta `RESEND_API_KEY` o Resend responde error,
   falla explícito (400/500/502) — sin correo no hay forma de verificar.

## 10. `mfa-verificar-codigo`

Quién la llama: la misma pantalla, al escribir el código.

1. `requireAdmin`.
2. Body: `{ codigo }`.
3. Busca el código MÁS RECIENTE de esa cuenta: debe coincidir, no estar
   usado, y no haber vencido (10 min).
4. Si es válido, lo marca usado (un código sirve una sola vez) y 200
   `{ ok: true }`. Esta función no sabe nada de "recordar el dispositivo"
   — eso lo decide el frontend (`AuthService`, localStorage, 30 días).

Secretos: `RESEND_API_KEY` (ya configurado, ver docs/SECRETS.md),
`MFA_EMAIL_FROM` (opcional, default `PRIVAS Magazine <contacto@privasmagazine.com>`).

## 11. `notificar-publicacion`

Quién la llama: un admin logueado, desde el panel, justo después de
"Publicar ahora" en un artículo o edición (issue #64).

Antes de esto, `estado` se ponía en `'publicado'` con un update directo del
cliente (RLS ya lo permite) y ahí terminaba todo — sin rebuild, sin
newsletter. Solo `programar-publicacion` (cron) los disparaba, y solo para
contenido que pasó por "Programar". Esta función reutiliza exactamente la
misma lógica que el cron (`_shared/publicacion.ts` — `dispararRebuild` y
`notificarNewsletter`, ahora compartidas por ambas) para que "Publicar
ahora" haga lo mismo.

1. `requireAdmin`.
2. Body: `{ articulos?: [{id,titulo,slug}], ediciones?: [{id,titulo}] }` — el
   frontend manda el artículo/edición que acaba de publicar. Si ambos vienen
   vacíos → 400.
3. `dispararRebuild()` + `notificarNewsletter()`, igual que en
   `programar-publicacion`. No fatal: si Resend o GitHub fallan, 200 igual
   (el contenido ya está publicado, esto es un extra).

El frontend (`NotificarPublicacionService`) la llama en paralelo sin
bloquear la navegación — si falla, no rompe el flujo de publicar.

## 12. `obtener-articulo-preview`

Quién la llama: cualquiera con el link de vista previa (issue #75) — pública,
sin sesión. El "acceso" es el propio token, no un rol.

1. Rate limit: `dentroDelLimite('obtener-articulo-preview', ipDeRequest(req), 20, 10)`.
2. Body: `{ token }`.
3. Con `service_role`: busca en `articulos` por `token_preview` — de
   CUALQUIER `estado` (borrador/programado/publicado/despublicado), a
   diferencia de `obtenerPublicoPorSlug` que solo trae publicados. A
   propósito no hay policy de RLS pública para esto: abrir una policy de
   lectura por columna sería una superficie pública permanente sobre
   `articulos`; en cambio, validar el token aquí en código es una función
   que se puede quitar/cambiar sin tocar RLS.
4. 404 genérico si no hay coincidencia (no distingue "token inválido" de
   "no existe", igual que `confirmar-suscripcion`).
5. 200 `{ articulo }` con el mismo shape que usa el resto del sitio
   (incluye categorías).

El frontend (`/preview/:token`, mismo componente que `/articulos/:slug`)
marca la página `noindex` y muestra un aviso visible de "vista previa" — no
carga "Sigue leyendo" (esa sección es solo para el artículo real).

## 13. `auditar-huerfanos`

Quién la llama: `dueno`/`admin_total` desde el panel (`/gestion-privas/archivos-huerfanos`),
a demanda — sin cron, es una revisión periódica manual (issue #66, después de
la limpieza puntual de la issue #62).

1. `requireAdmin` + rechaza `editor` (403).
2. Junta las rutas que la BD dice que deberían existir en el FTP:
   `articulos.imagen_portada_path` (si `imagen_portada_target = 'ftp'`),
   `ediciones_revista.pdf_path`/`portada_path` (mismo criterio), y
   `marcas.logo_url` si la URL empieza con `FTP_PUBLIC_BASE_URL` (se le
   resta el prefijo para sacar la ruta relativa a `uploads/`).
3. Se conecta por FTP (mismo patrón FTPS-primero-luego-plano que
   `subir-archivo`/`eliminar-archivo`) y recorre `uploads/` recursivo con
   `client.list()`.
4. Compara los dos conjuntos:
   - **huérfanos**: están en el FTP pero ninguna fila los referencia.
   - **rotos**: la BD dice que deberían existir pero no están en el FTP.
5. 200 con ambas listas. A propósito **nunca borra nada** — el borrado
   sigue siendo manual desde el File Manager de cPanel, mismo criterio que
   `deploy.yml` nunca toca `uploads/`.

Secretos: los mismos de `subir-archivo` (`FTP_HOST`/`USER`/`PASSWORD`,
`FTP_REMOTE_PREFIX`, `FTP_PUBLIC_BASE_URL`) — no agrega ninguno nuevo.

## Nota general sobre pruebas

- `invitar-admin`: probar con una segunda cuenta real, no la del dev.
- `subir-archivo` / `eliminar-archivo`: probar con `UPLOAD_TARGET=supabase`
  (hoy). La rama `ftp` no se puede probar en vivo hasta tener credenciales
  reales de Akky.
- `confirmar/cancelar-suscripcion`: probables de punta a punta ya. Sin
  `RESEND_API_KEY` no hay correo real: insertar un registro de prueba directo en
  `suscriptores_newsletter` vía SQL (el `insert` directo por SQL/dashboard no
  pasa por RLS, así que la policy pública cerrada no lo afecta), tomar su
  `token_confirmacion` y llamar la función manualmente.
- `suscribirse`: probar con el formulario de newsletter del sitio. Para
  probar el rate limit, llamar la función 6+ veces seguidas — la 6ª debe
  devolver 429. Revisar `intentos_publicos` por SQL para confirmar que se
  están registrando los intentos.
