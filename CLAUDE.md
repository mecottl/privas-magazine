# PRIVAS Magazine — contexto del proyecto

## Estado actual (4 sep 2026)

Este proyecto ya no está en fase "MVP" genérica: el **backend está
terminado y probado en vivo** (Edge Functions, RLS, cron de publicación
programada, limpieza de archivos huérfanos). El **frontend está en fase
activa de diseño y construcción** (editor de bloques, UI definitiva,
pulido de páginas públicas — ver milestone "Frontend — diseño y editor").

La migración de Hostinger a Akky (ver sección de Stack más abajo) **ya
terminó**: subida/borrado de archivos funciona en vivo por FTP, y
`deploy.yml` publica el sitio completo a Akky en cada push a `main`
(issue #19, cerrado 20 sep 2026). Vercel se dio de baja del pipeline el
mismo día (issue #59) — `privasmagazine.com` ya resuelve directo a Akky.
Niveles de permiso de administrador ya definidos y construidos (21 sep
2026): `dueno`, `admin_total` y `editor` — ver sección de esquema más abajo.

Plataforma editorial (artículos + revista digital) para PRIVAS Magazine.
Este archivo es la fuente de verdad de la arquitectura ya decidida. Léelo
completo antes de generar código. El seguimiento de pendientes vive en
**GitHub Issues** de este repo, no aquí — este archivo es solo arquitectura
y decisiones ya tomadas.

## Quién construye qué (regla de flujo de trabajo)

- **Claude Code construye todo el código**: proyecto Angular, Edge Functions,
  workflows de CI/CD.
- **El desarrollador configura Akky y Supabase a mano** desde los dashboards
  (Auth, Storage, extensiones, RLS ya aplicado). No asumas que vas a poder
  ejecutar cambios de configuración de esos dashboards — tu trabajo es el
  código que se conecta a esa configuración, no la configuración en sí.
- El esquema de base de datos y las políticas RLS **ya están aplicados** en el
  proyecto real de Supabase (ref `xiqqhjdpmqdnzsvpjhwq`). No los regeneres
  salvo que el desarrollador pida un cambio explícito — si hace falta un
  ALTER, escríbelo como migración nueva, no reescribas el esquema base.

## Aviso importante — proyecto hermano que NO se toca

Existe otro proyecto de Supabase (`privastravel`) que pertenece a la página
de la agencia de viajes de la misma clienta. Es completamente independiente.
Nunca conectes, leas ni modifiques nada relacionado a `privastravel` desde
este repo.

## Stack

- **Frontend**: Angular (standalone components, sin NgModules), compilado
  100% estático — sin Node.js en runtime (el hosting final no lo soporta).
- **Backend/BaaS**: Supabase (Postgres + Auth + Storage + Edge Functions),
  plan Free.
- **Hosting final**: **Akky** — cPanel + **FTP** (Akky confirmó que NO tiene
  SFTP). El build estático y los archivos pesados (PDFs, imágenes) viven ahí,
  NO en Supabase Storage.
- **CI/CD**: GitHub Actions — build de Angular + deploy directo a Akky por FTP.

> **Historial:** el plan original era Hostinger + SFTP real. Se cambió a
> Akky el 4 sep 2026 porque el hosting definitivo se decidió distinto, y
> Akky confirmó que solo ofrece FTP plano (sin cifrar) vía cPanel, no SFTP.
> El código de `subir-archivo` y `eliminar-archivo` ya se migró de
> `ssh2-sftp-client` a `basic-ftp` en consecuencia — ver detalle en
> `EDGE_FUNCTIONS_BRIEF.md`. Si Akky llega a habilitar SFTP/FTPS más
> adelante, vale la pena volver a cifrar esa subida.
>
> **19 sep 2026:** confirmado en vivo que la cuenta FTP de Akky apunta
> directo a la raíz pública del dominio, SIN la carpeta `public_html/` de
> la convención estándar de cPanel — un archivo de prueba subido a
> `public_html/uploads/...` dio 404 (issue #55). El prefijo remoto quedó
> vacío por default y es configurable vía `FTP_REMOTE_PREFIX` si algún día
> hace falta.

## Esquema de base de datos (ya aplicado, no regenerar)

Tablas: `articulos`, `categorias`, `articulos_categorias` (m2m),
`ediciones_revista`, `perfiles_admin`, `marcas`, `suscriptores_newsletter`,
`mfa_codigos`, `bitacora_admin`.

- `perfiles_admin.id` = `auth.users.id` (sin duplicar login).
- `perfiles_admin.mfa_activo` (issue #17): opt-in de MFA por correo para
  `admin_total`/`editor` — autoservicio, columna con GRANT propio para que
  cada quien la prenda/apague para SU cuenta. Para `dueno` es obligatorio
  sin importar este valor (`AuthService.mfaRequerido()` lo ignora para ese
  nivel). `mfa_codigos` guarda los códigos de 6 dígitos de un solo uso (10
  min de vigencia) — sin políticas de RLS, solo la tocan `mfa-enviar-codigo`
  / `mfa-verificar-codigo` con `service_role`.
- `is_admin()` es la función `security definer` que valida permisos en TODAS
  las políticas RLS de escritura — reutilízala, no dupliques la lógica.
- `estado` en `articulos` y `ediciones_revista`: `borrador` / `programado` /
  `publicado` / `despublicado`. La visibilidad pública SOLO depende de
  `estado = 'publicado'` (RLS ya filtra esto).
- `nivel_permiso` en `perfiles_admin` es texto con un CHECK que permite tres
  valores — **poder absoluto es SOLO del `dueno`**, `admin_total` es un
  nivel intermedio:
  - `'dueno'`: todo. El único que invita/gestiona cuentas `dueno` o
    `admin_total`, el único que cambia el `nivel_permiso` de cualquiera, el
    único que restablece la contraseña de otra cuenta, y también puede
    eliminar/activar cuentas `editor`.
  - `'admin_total'`: solo invita cuentas `editor` y solo activa/desactiva/
    elimina cuentas `editor` — no toca otras cuentas `admin_total` ni
    `dueno`, no cambia niveles, no restablece contraseñas ajenas. Sí tiene
    el mismo acceso total a artículos que el dueño (ver abajo).
  - `'editor'`: todo el panel EXCEPTO Administradores, y solo edita/borra
    sus propios artículos (ver `articulos.creado_por`).
  Funciones `security definer`: `es_admin_total()` y `es_dueno()`. No
  conviertas esto a enum.
- `articulos.creado_por` (uuid, `default auth.uid()`) es el dueño REAL de la
  fila para efectos de permisos — distinto de `autor_texto`/`autor_uid`, que
  son el byline público y pueden decir cualquier cosa. RLS de UPDATE/DELETE
  en `articulos` exige `es_admin_total()`, `es_dueno()`, o `creado_por =
  auth.uid()`.
- `autor_tipo` en `articulos` es `'libre'` o `'usuario'`, con un CHECK que
  obliga a llenar `autor_texto` o `autor_uid` según corresponda.
- **Categorías: YA implementadas y en uso**, no son un pendiente. Las trae
  dinámicamente `CategoriasService` desde la tabla `categorias`, con
  filtro real en la página de artículos — no están hardcodeadas en el
  frontend. Si la clienta pide agregar/quitar una categoría, es un dato
  (insert/update en la tabla), no un cambio de código.
- `*_target` (`imagen_portada_target`, `pdf_target`, `portada_target`) en
  `articulos`/`ediciones_revista`: `'supabase' | 'ftp'` — destino real donde
  vive ESE archivo específico, distinto de la URL (necesario para poder
  borrarlo luego). Renombrado de `'sftp'` a `'ftp'` el 4 sep 2026 (ver
  migración `20260904220000_renombrar_target_sftp_a_ftp.sql`).
- `articulos.token_preview` (issue #75, uuid, `default gen_random_uuid()`):
  token de vista previa pública — sin policy de RLS propia, solo lo valida
  `obtener-articulo-preview` con `service_role`.
- `eliminado_en` (issue #77, timestamptz nullable) en `articulos` y
  `ediciones_revista`: soft-delete — "Eliminar" en el panel ya no hace
  `DELETE`, solo pone esta fecha. La policy de lectura pública ahora exige
  `estado = 'publicado' AND eliminado_en is null`; un admin (`is_admin()`)
  sigue viendo todo, incluida la papelera. `programar-publicacion` purga
  (DELETE real) lo que lleve más de 30 días aquí, en cada corrida del cron
  — no hay un cron nuevo para esto.
- `bitacora_admin` (issue #76): quién publicó/despublicó/programó/eliminó
  qué y cuándo, y quién invitó/gestionó/eliminó qué cuenta de admin. Solo
  `dueno`/`admin_total` la leen (policy con `es_admin_total()`/`es_dueno()`).
  Se llena de dos formas: (1) trigger `registrar_bitacora_estado()`
  (`security definer`) en `articulos`/`ediciones_revista`, disparado en
  UPDATE de `estado` y en DELETE — solo si hay un admin real detrás
  (`auth.uid()` no nulo; los cambios de `programar-publicacion` vía cron no
  se registran aquí); (2) `invitar-admin`/`set-admin-activo` insertan
  directo con `service_role` (`_shared/bitacora.ts`). Guarda `admin_nombre`
  como snapshot para no perder el rastro si esa cuenta se elimina después.

## Piezas de arquitectura — Edge Functions (12 en total)

Detalle completo de lógica en `EDGE_FUNCTIONS_BRIEF.md` — aquí solo el mapa.

| Función | Quién la llama | Qué hace |
| --- | --- | --- |
| `subir-archivo` | admin (panel) | Sube a Supabase Storage o FTP (Akky) según `UPLOAD_TARGET`. |
| `eliminar-archivo` | triggers de BD (`pg_net`) | Limpieza automática de archivos huérfanos al reemplazar/borrar. |
| `programar-publicacion` | `pg_cron` cada 15 min | Publica lo programado, dispara rebuild + newsletter. |
| `invitar-admin` | dueno/admin_total (panel) | Única vía autorizada para crear cuentas nuevas de admin. `admin_total` solo invita `editor`; `editor` no puede llamarla. |
| `set-admin-activo` | dueno/admin_total (panel) | Activar/desactivar/eliminar OTRO admin, cambiar su nivel, o restablecerle la contraseña (RLS de `perfiles_admin` no lo permite desde el cliente). `admin_total` solo gestiona cuentas `editor` y no cambia niveles ni contraseñas ajenas — eso es solo del `dueno`. Bloquea auto-gestión y dejar 0 admins/admin_total/dueno activos. |
| `suscribirse` | público (form de newsletter) | Alta al newsletter con rate limiting (5/10min por IP) — reemplaza el INSERT directo del frontend. |
| `confirmar-suscripcion` | público (link de correo) | Doble opt-in del newsletter, con rate limiting (10/15min por IP). |
| `cancelar-suscripcion` | público (link de correo) | Baja del newsletter por token, no borra la fila. Mismo rate limiting que confirmar. |
| `mfa-enviar-codigo` | admin logueado (panel) | MFA propio por correo (issue #17, no el TOTP nativo de Supabase): genera un código de 6 dígitos y lo manda por Resend. |
| `mfa-verificar-codigo` | admin logueado (panel) | Verifica el código contra `mfa_codigos`. El frontend decide cuánto "recordar" el dispositivo (localStorage, 30 días). |
| `notificar-publicacion` | admin logueado (panel) | Issue #64: dispara rebuild + newsletter para "Publicar ahora" (inmediato) — antes solo `programar-publicacion` (cron) lo hacía, y solo para contenido programado. Misma lógica compartida (`_shared/publicacion.ts`). |
| `obtener-articulo-preview` | público (link de vista previa) | Issue #75: devuelve un artículo de cualquier `estado` por `articulos.token_preview`, para que la clienta lo revise antes de publicar sin sesión de admin. Sin policy de RLS pública nueva — el token se valida en código con `service_role`. |

### Editor de contenido de artículos
Constructor de bloques libre: texto, imágenes, video embebido, layout libre
dentro del artículo (la clienta pidió libertad total tipo "arma tu página
como quieras"). Evaluar una librería existente (TipTap, Editor.js,
ngx-editor) antes de construir un editor propio. El contenido se guarda como
JSON en `articulos.contenido_json`.

El `extracto` se genera automáticamente a partir del contenido (no lo llena
el usuario a mano) — resuélvelo en el momento de guardar (frontend o Edge
Function), truncando el texto plano extraído del JSON de bloques.

### Programación de publicación + recompilación automática
`programar-publicacion`, disparada por `pg_cron` cada 15 min (`pg_cron` y
`pg_net` ya activas):
```sql
update articulos set estado = 'publicado'
where estado = 'programado' and fecha_publicacion <= now();
-- mismo patrón para ediciones_revista
```
Si hubo filas afectadas, dispara (vía `pg_net`) un `repository_dispatch`
hacia GitHub Actions para reconstruir y redesplegar el sitio — esto es lo
que resuelve el SEO/Open Graph correcto por artículo, dado que es una SPA
estática sin servidor Node en producción.

## Decisiones de frontend

- **Diseño y estructura de secciones: libertad creativa total.** Usa como
  referencia visual el moodboard de la clienta (Yucatán Today, RSVP) — líneas
  limpias, foco en fotografía, tarjetas de artículo con imagen + categoría +
  fecha.
- **100% responsive, mobile-first.** Diseña primero para celular.
- **Login de administración en ruta oculta** (`/gestion-privas`), sin link
  visible en la navegación pública. Esto es solo para que un visitante
  normal no la encuentre por accidente — la seguridad real es Supabase
  Auth + RLS, no la ruta oscura.
- **Aviso de privacidad**: página + link visible en el footer (obligatorio
  porque se recolectan correos para el newsletter).
- Secciones esperadas: inicio, listado de artículos con filtro por categoría,
  detalle de artículo, catálogo/biblioteca de todas las ediciones de revista
  (no solo la más reciente), Nuestras Marcas (enlaces a redes sociales del
  grupo), footer con aviso de privacidad.
- Meta tags dinámicos (Open Graph) por artículo — depende de la estrategia de
  recompilación descrita arriba.

## Variables de entorno / secretos (nunca hardcodear)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — sí van en el frontend, son públicas.
- `SUPABASE_SERVICE_ROLE_KEY` — SOLO en Edge Functions, nunca en el bundle de
  Angular.
- `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_PUBLIC_BASE_URL` — secretos de
  Edge Function (Akky). Antes eran `SFTP_*` — renombrados el 4 sep 2026.
  `FTP_REMOTE_PREFIX` opcional (default vacío — NO poner `public_html`,
  ver nota de "19 sep 2026" arriba).
- `RESEND_API_KEY` — secreto de Edge Function, se activa cuando exista el
  dominio.
- Lista completa (incluye `CRON_SECRET`, `GH_DISPATCH_TOKEN`, `UPLOAD_TARGET`,
  `UPLOAD_BUCKET`, secretos de GitHub Actions, etc.): `docs/SECRETS.md`.

## Pendientes de negocio que SÍ afectan código (avisar si se topa con estos)

- Ediciones de revista: si necesitan historial de versiones del mismo PDF o
  solo reemplazo directo — sigue sin confirmar, construir asumiendo
  reemplazo directo salvo indicación contraria.
- Sección "Nuestras Marcas": si es fija o administrable desde el panel —
  sigue sin confirmar, construir el CRUD de todos modos ya que la tabla
  `marcas` ya existe, pero avisar si se prefiere dejarla fija por ahora.

## Dónde está el seguimiento de trabajo

**GitHub Issues de este repo** — no hay un TODO paralelo en Drive ni en este
archivo. Labels: `backend`, `frontend`, `bug`, `bloqueado-dominio`,
`pendiente-cliente`, `seguridad`, `transferencia`, `documentation`.
Milestones: "Backend — fase 1", "Frontend — diseño y editor", "Transferencia
final".

Documentación de arquitectura que SÍ vive fuera de este archivo:
- `README.md` — estructura de carpetas y cómo correr el proyecto local.
- `EDGE_FUNCTIONS_BRIEF.md` — lógica detallada de cada Edge Function.
- `docs/SECRETS.md` — cada secreto: qué es, dónde se obtiene, dónde se
  configura.
- Carpeta de Documentación en Drive — explicación en lenguaje llano para la
  clienta (no técnica), y el historial de descubrimiento del proyecto
  (propuesta original, respuestas de la clienta).