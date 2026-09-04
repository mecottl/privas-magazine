# PRIVAS Magazine — contexto del proyecto

## Estado actual (4 sep 2026)

Este proyecto ya no está en fase "MVP" genérica: el **backend está
terminado y probado en vivo** (Edge Functions, RLS, cron de publicación
programada, limpieza de archivos huérfanos). El **frontend está en fase
activa de diseño y construcción** (editor de bloques, UI definitiva,
pulido de páginas públicas — ver milestone "Frontend — diseño y editor").

La infraestructura final se está migrando de Hostinger a Akky (ver sección
de Stack más abajo) — el código de subida/borrado de archivos ya se
adaptó a FTP, falta el paso de deploy y las credenciales reales.

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
- **Staging temporal**: Vercel, mientras no exista la cuenta de Akky de la
  clienta (pendiente de que ella la contrate).
- **CI/CD**: GitHub Actions — build de Angular + deploy.

> **Historial:** el plan original era Hostinger + SFTP real. Se cambió a
> Akky el 4 sep 2026 porque el hosting definitivo se decidió distinto, y
> Akky confirmó que solo ofrece FTP plano (sin cifrar) vía cPanel, no SFTP.
> El código de `subir-archivo` y `eliminar-archivo` ya se migró de
> `ssh2-sftp-client` a `basic-ftp` en consecuencia — ver detalle en
> `EDGE_FUNCTIONS_BRIEF.md`. Si Akky llega a habilitar SFTP/FTPS más
> adelante, vale la pena volver a cifrar esa subida.

## Esquema de base de datos (ya aplicado, no regenerar)

Tablas: `articulos`, `categorias`, `articulos_categorias` (m2m),
`ediciones_revista`, `perfiles_admin`, `marcas`, `suscriptores_newsletter`.

- `perfiles_admin.id` = `auth.users.id` (sin duplicar login).
- `is_admin()` es la función `security definer` que valida permisos en TODAS
  las políticas RLS de escritura — reutilízala, no dupliques la lógica.
- `estado` en `articulos` y `ediciones_revista`: `borrador` / `programado` /
  `publicado` / `despublicado`. La visibilidad pública SOLO depende de
  `estado = 'publicado'` (RLS ya filtra esto).
- `nivel_permiso` en `perfiles_admin` es texto con un CHECK que hoy solo
  permite `'admin_total'` — se ampliará cuando la clienta defina más niveles.
  No lo conviertas a enum.
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

## Piezas de arquitectura — Edge Functions (7 en total)

Detalle completo de lógica en `EDGE_FUNCTIONS_BRIEF.md` — aquí solo el mapa.

| Función | Quién la llama | Qué hace |
| --- | --- | --- |
| `subir-archivo` | admin (panel) | Sube a Supabase Storage o FTP (Akky) según `UPLOAD_TARGET`. |
| `eliminar-archivo` | triggers de BD (`pg_net`) | Limpieza automática de archivos huérfanos al reemplazar/borrar. |
| `programar-publicacion` | `pg_cron` cada 15 min | Publica lo programado, dispara rebuild + newsletter. |
| `invitar-admin` | admin (panel) | Única vía autorizada para crear cuentas nuevas de admin. |
| `set-admin-activo` | admin (panel) | Activar/desactivar OTRO admin (RLS de `perfiles_admin` no lo permite desde el cliente). Bloquea auto-desactivación y dejar 0 admins activos. |
| `confirmar-suscripcion` | público (link de correo) | Doble opt-in del newsletter. |
| `cancelar-suscripcion` | público (link de correo) | Baja del newsletter por token, no borra la fila. |

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
- `RESEND_API_KEY` — secreto de Edge Function, se activa cuando exista el
  dominio.
- Lista completa (incluye `CRON_SECRET`, `GH_DISPATCH_TOKEN`, `UPLOAD_TARGET`,
  `UPLOAD_BUCKET`, secretos de GitHub Actions, etc.): `docs/SECRETS.md`.

## Pendientes de negocio que SÍ afectan código (avisar si se topa con estos)

- Niveles de permiso exactos de administrador — hoy solo existe
  `admin_total`. Si Claude Code necesita construir la UI de "niveles de
  permiso" y esto sigue sin definirse, avisar antes de inventar niveles.
- Ediciones de revista: si necesitan historial de versiones del mismo PDF o
  solo reemplazo directo — sigue sin confirmar, construir asumiendo
  reemplazo directo salvo indicación contraria.
- Sección "Nuestras Marcas": si es fija o administrable desde el panel —
  sigue sin confirmar, construir el CRUD de todos modos ya que la tabla
  `marcas` ya existe, pero avisar si se prefiere dejarla fija por ahora.
- **Nombre exacto de la ruta de cuentas FTP dentro de cPanel de Akky** —
  pendiente de confirmar (equivalente a lo que en Hostinger era
  hPanel → Archivos → Cuentas FTP).

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