# PRIVAS Magazine

Plataforma editorial (artículos + revista digital). Ver [`CLAUDE.md`](./CLAUDE.md)
para la arquitectura completa y las decisiones ya tomadas.

## Stack

- **Frontend**: Angular 22 (standalone components, sin NgModules), build 100% estático.
- **BaaS**: Supabase (Postgres + Auth + Storage + Edge Functions), ref `xiqqhjdpmqdnzsvpjhwq`.
- **Hosting**: Hostinger (SFTP) en producción; Cloudflare Pages / Vercel en staging.
- **CI/CD**: GitHub Actions.

## Estructura

```
src/
  environments/            environment.ts (prod) · environment.development.ts (local)
  app/
    core/                  singletons: supabase client, auth, guard, modelos
      supabase/            SupabaseService (anon key)
      auth/                AuthService + adminGuard
      models/              tipos de dominio + database.types.ts (generado)
    shared/                componentes/pipes/directivas reutilizables
    features/
      public/              SITIO PÚBLICO
        layout/            PublicLayout (navbar + footer con aviso de privacidad)
        pages/             inicio, articulos, articulo-detalle, revistas,
                           marcas, aviso-privacidad, newsletter/
        public.routes.ts
      admin/               PANEL DE ADMINISTRACIÓN (ruta oculta /gestion-privas)
        layout/            AdminLayout (sidebar)
        pages/             login, dashboard, articulos, ediciones, marcas,
                           administradores
        editor-contenido/  editor de bloques (CLAUDE.md § 1)
        admin.routes.ts

supabase/
  config.toml
  functions/
    _shared/               cors.ts · clients.ts (admin/user/requireAdmin)
    subir-archivo/         panel → SFTP/Storage → URL pública (§ 2)
    programar-publicacion/ pg_cron cada 15 min + rebuild + newsletter (§ 3, § 5)
    invitar-admin/         única alta de admins con service_role (§ 4)
    confirmar-suscripcion/ doble opt-in newsletter (§ 5)
    cancelar-suscripcion/  baja por token (§ 5)
  migrations/              20260901230618_suscriptores_newsletter.sql

.github/workflows/
  deploy.yml               build Angular estático + deploy
  supabase-functions.yml   deploy de Edge Functions

docs/SECRETS.md            secretos a configurar a mano en los dashboards
```

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
