# PRIVAS Magazine

Plataforma editorial (artículos + revista digital). Ver [`CLAUDE.md`](./CLAUDE.md)
para la arquitectura completa y las decisiones ya tomadas.

## Stack

- **Frontend**: Angular 22 (standalone components, sin NgModules), build 100% estático.
- **BaaS**: Supabase (Postgres + Auth + Storage + Edge Functions), ref `xiqqhjdpmqdnzsvpjhwq`.
- **Hosting**: Akky (cPanel + FTP) en producción. Vercel se usó como staging temporal hasta el 20 sep 2026 (issue #59) — ya no forma parte del pipeline.
- **CI/CD**: GitHub Actions.

## Estructura

Deliberadamente sin árbol de carpetas detallado aquí — con features y páginas
agregándose seguido, un árbol línea por línea queda desactualizado rápido
(pasó con la versión anterior de este README). Panorama de alto nivel:

```
src/app/
  core/        singletons: cliente de Supabase, auth + guards, modelos de dominio
  shared/      componentes/pipes/directivas realmente reutilizados entre features
  features/
    public/    SITIO PÚBLICO — layout, páginas y componentes bajo public.routes.ts
    admin/     PANEL DE ADMINISTRACIÓN (ruta oculta /gestion-privas) — bajo admin.routes.ts,
               incluye editor-contenido/ (editor de bloques)
    docs/      documentación in-app solo para el dueño (/documentacion)

supabase/
  config.toml
  functions/   12 Edge Functions + _shared/ (cors, clientes, rate limit, publicación) —
               ver EDGE_FUNCTIONS_BRIEF.md para el detalle de cada una
  migrations/  cambios incrementales al esquema — ver CLAUDE.md

.github/workflows/   deploy.yml · supabase-functions.yml · backup-db.yml
docs/                SECRETS.md, RUNBOOK.md, RESTORE_BACKUP.md, CHECKLIST_QA.md, DISENO_LANDING.MD
```

Para la lista real y vigente de páginas/rutas, lee `public.routes.ts` /
`admin.routes.ts` directo — son la fuente de verdad, no este README.

## Desarrollo

```bash
npm install
# rellena src/environments/environment.development.ts con supabaseAnonKey
npm start
```

Edge Functions (requiere Supabase CLI + Docker):

```bash
supabase functions serve
```

## Notas

- La ruta del panel (`gestion-privas`) está en `app.routes.ts` y `environment.adminBasePath`.
- El esquema de BD y las RLS ya están aplicados en Supabase — no regenerar (ver CLAUDE.md).
- Nunca conectar nada del proyecto hermano `privastravel`.
