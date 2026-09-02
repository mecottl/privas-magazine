# PRIVAS Magazine — contexto del proyecto

Plataforma editorial (artículos + revista digital) para PRIVAS Magazine.
Este archivo es la fuente de verdad de la arquitectura ya decidida. Léelo
completo antes de generar código. No relees el chat de planeación — todo lo
relevante está aquí.

## Quién construye qué (regla de flujo de trabajo)

- **Claude Code construye todo el código**: proyecto Angular, Edge Functions,
  workflows de CI/CD.
- **El desarrollador configura Hostinger y Supabase a mano** desde los
  dashboards (Auth, Storage, extensiones, RLS ya aplicado). No asumas que vas
  a poder ejecutar cambios de configuración de esos dashboards — tu trabajo es
  el código que se conecta a esa configuración, no la configuración en sí.
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
- **Hosting final**: Hostinger Premium (SFTP, sin Node.js) — el build
  estático y los archivos pesados (PDFs, imágenes) viven ahí, NO en Supabase
  Storage.
- **Staging temporal**: Cloudflare Pages o Vercel, mientras no exista la
  cuenta de Hostinger de la clienta (pendiente de que ella pague).
- **CI/CD**: GitHub Actions — build de Angular + deploy.

## Esquema de base de datos (ya aplicado, no regenerar)

Tablas: `articulos`, `categorias`, `ediciones_revista`, `perfiles_admin`,
`marcas`. Falta agregar `suscriptores_newsletter` (ver sección Newsletter).

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

## Piezas de arquitectura que SÍ construye Claude Code

### 1. Editor de contenido de artículos
Constructor de bloques libre: texto, imágenes, video embebido, layout libre
dentro del artículo (la clienta pidió libertad total tipo "arma tu página
como quieras"). Evaluar una librería existente (TipTap, Editor.js,
ngx-editor) antes de construir un editor propio. El contenido se guarda como
JSON en `articulos.contenido_json`.

El `extracto` se genera automáticamente a partir del contenido (no lo llena
el usuario a mano) — resuélvelo en el momento de guardar (frontend o Edge
Function), truncando el texto plano extraído del JSON de bloques.

### 2. Puente de subida de archivos
```
Panel Angular → Edge Function "subir-archivo" → SFTP → Hostinger (public_html/uploads)
```
La Edge Function recibe el archivo desde el panel, se conecta por SFTP a
Hostinger, lo sube, y devuelve la URL pública final para guardar en
`imagen_portada_url`, `pdf_url` o `portada_url` según corresponda. Las
credenciales SFTP van como secreto de la Edge Function — NUNCA en el
frontend. Durante la etapa de staging (sin Hostinger real todavía), esta
función puede apuntar temporalmente al bucket privado de Supabase Storage ya
creado, y cambiar de destino cuando exista la cuenta Hostinger real —
diséñala con el destino configurable, no hardcodeado.

### 3. Programación de publicación + recompilación automática
Edge Function `programar-publicacion`, disparada por `pg_cron` cada 15 min
(las extensiones `pg_cron` y `pg_net` ya están activas en el proyecto):
```sql
update articulos set estado = 'publicado'
where estado = 'programado' and fecha_publicacion <= now();
-- mismo patrón para ediciones_revista
```
Si hubo filas afectadas, dispara (vía `pg_net`) un webhook hacia GitHub
Actions para reconstruir y redesplegar el sitio — esto es lo que resuelve el
SEO/Open Graph correcto por artículo, dado que es una SPA estática sin
servidor Node en producción.

### 4. Gestión de administradores
Edge Function `invitar-admin` — única vía autorizada para crear cuentas
nuevas de admin, usa `SUPABASE_SERVICE_ROLE_KEY` (nunca expuesta al
frontend):
1. `auth.admin.createUser()` para la cuenta en `auth.users`
2. `insert` en `perfiles_admin` con el `nivel_permiso` indicado

No expongas ningún flujo de creación de admins que no pase por esta función.

### 5. Newsletter / suscripción por correo (toques finales, no bloquea el resto)
- Tabla nueva `suscriptores_newsletter` (email, activo, token_confirmacion,
  fecha_alta). RLS: `INSERT` público (cualquiera se puede suscribir), `SELECT`
  solo admin (nunca expongas la lista completa de correos).
- Doble opt-in: Edge Function `confirmar-suscripcion` que activa `activo =
  true` cuando el visitante hace clic en el link de confirmación.
- Link de baja individual: Edge Function `cancelar-suscripcion` por token.
- El envío real usa el producto de "marketing" de Resend (por contactos, no
  por email enviado) — pero esto depende de que exista el dominio real, así
  que el código se puede dejar listo con las llamadas a Resend, aunque no se
  pueda probar en vivo hasta el cutover final.
- Se dispara desde la misma Edge Function `programar-publicacion` cuando algo
  pasa a `publicado`.

## Decisiones de frontend

- **Diseño y estructura de secciones: libertad creativa total.** Usa como
  referencia visual el moodboard de la clienta (Yucatán Today, RSVP) — líneas
  limpias, foco en fotografía, tarjetas de artículo con imagen + categoría +
  fecha.
- **100% responsive, mobile-first.** Diseña primero para celular.
- **Login de administración en ruta oculta**, sin link visible en la
  navegación pública (ej. `/gestion-privas` o similar, no algo obvio como
  `/admin` o `/login`). Esto es solo para que un visitante normal no la
  encuentre por accidente — la seguridad real es Supabase Auth + RLS, no la
  ruta oscura.
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
- `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD` — secretos de Edge Function.
- `RESEND_API_KEY` — secreto de Edge Function, se activa cuando exista el
  dominio.

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