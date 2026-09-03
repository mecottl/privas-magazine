# Brief: MVP funcional (para pruebas en vivo)

Objetivo de esta fase: un frontend que permita probar de punta a punta todo lo
que ya se construyó (Auth, RLS, las 5 Edge Functions, el cron de publicación).
NO es la versión final — sin diseño pulido, sin el editor de bloques definitivo.
Prioriza que cada pieza del backend se pueda ejercitar de verdad desde una
pantalla real, aunque sea fea.

Lee `CLAUDE.md` y `EDGE_FUNCTIONS_BRIEF.md` antes de empezar.

## Fuera de alcance por ahora

- Diseño visual definitivo (después, con libertad creativa total).
- Librería de editor de bloques — para `contenido_json` usar por ahora un
  `<textarea>` con un JSON básico `[{ "tipo": "texto", "contenido": "..." }]`.
  El objetivo es que se guarde y se lea bien, no que la edición sea cómoda.
- Meta tags dinámicos / Open Graph.
- Cualquier cosa que dependa de SFTP o `RESEND_API_KEY` (pero SÍ debe probarse
  con `UPLOAD_TARGET=supabase`).

## Panel de administración (ruta oculta `/gestion-privas`)

1. **Login** — Supabase Auth (`signInWithPassword`) + `AuthGuard`.
2. **CRUD de categorías** — listar, crear, editar, eliminar.
3. **CRUD de artículos**
   - Listado con filtro por estado.
   - Formulario: título, slug (autogenerado, editable), autor (libre/usuario),
     categoría, imagen de portada (`subir-archivo`, `tipo=articulo-portada`),
     contenido (textarea JSON), estado, fecha de publicación (si programado).
   - Acciones de estado: publicar ahora, despublicar, volver a borrador.
4. **CRUD de ediciones de revista** — título, temporada, año, PDF
   (`subir-archivo`, `tipo=revista-pdf`) y portada (`tipo=revista-portada`),
   estado, fecha de publicación.
5. **Gestión de administradores** — formulario que llama a `invitar-admin` +
   listado de `perfiles_admin`.

## Sitio público

1. **Inicio** — artículos publicados, filtro por categoría.
2. **Detalle de artículo** — render simple de `contenido_json` (solo el campo
   `contenido` de cada bloque como texto plano).
3. **Catálogo de revistas** — ediciones publicadas, portada clickeable que abre
   el PDF en pestaña nueva.
4. **Nuestras Marcas** — lee de `marcas` (puede estar vacía).
5. **Footer** — link a "Aviso de Privacidad" (placeholder está bien).
6. **Formulario de suscripción** — email → `INSERT` directo a
   `suscriptores_newsletter` con la clave pública (RLS lo permite sin sesión).
7. **`/newsletter/confirmar` y `/newsletter/cancelar`** — leen `?token=`, llaman
   a la Edge Function correspondiente y muestran el mensaje.

## Checklist de pruebas

- [ ] Login con la cuenta de admin de prueba existente.
- [ ] Crear una categoría nueva.
- [ ] Crear un artículo en borrador, subir su imagen de portada.
- [ ] Publicarlo directo — confirmar que aparece en el sitio público.
- [ ] Crear otro artículo "programado" a 1-2 min en el futuro — esperar y
      confirmar que el cron lo publica solo (y que se disparó el rebuild en
      GitHub Actions).
- [ ] Despublicar un artículo — desaparece del público pero sigue en el panel.
- [ ] Subir una edición completa (PDF + portada) y confirmar que el PDF abre
      desde el catálogo público.
- [ ] Invitar una cuenta de admin nueva — confirmar que llega la invitación y
      que puede loguearse.
- [ ] Suscribir un correo de prueba, tomar el `token_confirmacion` vía SQL y
      visitar `/newsletter/confirmar?token=...`.
- [ ] Repetir con `/newsletter/cancelar?token=...` y confirmar que `activo`
      vuelve a `false`.
