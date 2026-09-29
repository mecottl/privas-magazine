-- Migración RETROACTIVA / histórica (issue #91, auditoría de solo-lectura).
--
-- El esquema base del proyecto (estas tablas, is_admin(), las políticas
-- originales) se creó a mano en el SQL Editor del dashboard de Supabase,
-- ANTES de que este repo empezara a llevar un historial de migraciones —
-- por eso ninguna migración anterior a esta lo documentaba, y el propio
-- comentario de `20260901230618_suscriptores_newsletter.sql` ("no toca el
-- esquema base ya aplicado") lo daba por hecho sin que existiera en ningún
-- archivo.
--
-- Este archivo documenta ese estado base tal como vive HOY en el proyecto
-- real (`xiqqhjdpmqdnzsvpjhwq`), reconstruido leyendo `list_tables`,
-- `pg_policies` y `pg_get_functiondef` contra el proyecto en vivo — no es
-- un registro exacto de cómo se creó paso a paso en su momento (eso se
-- perdió), pero sí es fiel a lo que hay que tener para que el resto de las
-- migraciones de esta carpeta (que sí asumen que esto ya existe) apliquen
-- limpio sobre un proyecto nuevo.
--
-- NO ejecutar contra el proyecto real (`xiqqhjdpmqdnzsvpjhwq`): ya existe
-- ahí. Es para reconstruir un proyecto nuevo desde cero (ver
-- docs/RESTORE_BACKUP.md) o para tener la definición completa a la vista
-- sin depender del dashboard.

-- ============================================================
-- Función central de permisos — la reutiliza TODA policy de escritura.
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfiles_admin
    where id = auth.uid() and activo = true
  );
$$;

-- ============================================================
-- perfiles_admin — cuentas de administración del panel.
-- nivel_permiso empieza con un CHECK de un solo valor a propósito: los
-- niveles 'editor'/'dueno' los agregan `nivel_permiso_editor.sql` y
-- `agregar_nivel_dueno.sql` más adelante, en ese orden.
-- ============================================================
create table public.perfiles_admin (
  id uuid primary key references auth.users(id),
  nombre_visible text,
  nivel_permiso text not null default 'admin_total'
    check (nivel_permiso = 'admin_total'),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.perfiles_admin enable row level security;

create policy "admins pueden ver todos los perfiles"
  on public.perfiles_admin
  for select
  using (is_admin());

create policy "un admin puede editar su propio nombre visible"
  on public.perfiles_admin
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- categorias
-- ============================================================
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table public.categorias enable row level security;

create policy "cualquiera puede leer categorias"
  on public.categorias for select using (true);
create policy "solo admins escriben categorias"
  on public.categorias for insert with check (is_admin());
create policy "solo admins actualizan categorias"
  on public.categorias for update using (is_admin()) with check (is_admin());
create policy "solo admins borran categorias"
  on public.categorias for delete using (is_admin());

-- ============================================================
-- articulos — columnas base. `imagen_portada_target`/`token_preview`/
-- `eliminado_en`/`creado_por` llegan en migraciones posteriores.
-- ============================================================
create table public.articulos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  contenido_json jsonb not null default '[]'::jsonb,
  extracto text,
  autor_tipo text not null check (autor_tipo in ('libre', 'usuario')),
  autor_texto text,
  autor_uid uuid references public.perfiles_admin(id),
  imagen_portada_url text,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'programado', 'publicado', 'despublicado')),
  fecha_publicacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.articulos enable row level security;

-- Las 4 de abajo se DROPean y recrean con otro criterio en
-- nivel_permiso_editor.sql (issue #91: nombres exactos para que ese
-- `drop policy` de más adelante encuentre algo que borrar).
create policy "lectura de articulos"
  on public.articulos for select using (estado = 'publicado' or is_admin());
create policy "solo admins crean articulos"
  on public.articulos for insert with check (is_admin());
create policy "solo admins actualizan articulos"
  on public.articulos for update using (is_admin()) with check (is_admin());
create policy "solo admins borran articulos"
  on public.articulos for delete using (is_admin());

-- ============================================================
-- articulos_categorias (m2m) — issue #91: aunque
-- `articulos_categorias_m2m.sql` (3 sep) ya está en el repo, sus policies de
-- insert/delete asumen que existían antes con estos nombres (las dropea
-- `nivel_permiso_editor.sql`), así que van aquí, no ahí.
-- ============================================================
create table public.articulos_categorias (
  articulo_id uuid not null references public.articulos(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  primary key (articulo_id, categoria_id)
);
alter table public.articulos_categorias enable row level security;

create policy "lectura publica de articulos_categorias"
  on public.articulos_categorias for select using (true);
create policy "solo admins asignan categorias a articulos"
  on public.articulos_categorias for insert with check (is_admin());
create policy "solo admins quitan categorias de articulos"
  on public.articulos_categorias for delete using (is_admin());

-- ============================================================
-- ediciones_revista
-- ============================================================
create table public.ediciones_revista (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  temporada text not null check (temporada in ('primavera-verano', 'otono-invierno')),
  anio integer not null,
  pdf_url text not null,
  portada_url text not null,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'programado', 'publicado', 'despublicado')),
  fecha_publicacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ediciones_revista enable row level security;

create policy "lectura de ediciones"
  on public.ediciones_revista for select using (estado = 'publicado' or is_admin());
create policy "solo admins crean ediciones"
  on public.ediciones_revista for insert with check (is_admin());
create policy "solo admins actualizan ediciones"
  on public.ediciones_revista for update using (is_admin()) with check (is_admin());
create policy "solo admins borran ediciones"
  on public.ediciones_revista for delete using (is_admin());

-- ============================================================
-- marcas
-- ============================================================
create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  red_social_url text,
  logo_url text,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.marcas enable row level security;

create policy "cualquiera puede leer marcas"
  on public.marcas for select using (true);
create policy "solo admins escriben marcas"
  on public.marcas for insert with check (is_admin());
create policy "solo admins actualizan marcas"
  on public.marcas for update using (is_admin()) with check (is_admin());
create policy "solo admins borran marcas"
  on public.marcas for delete using (is_admin());
