-- Niveles de permiso: admin_total (todo) + editor (solo sus propios
-- artículos, no gestiona otros admins). Alcance confirmado con el
-- desarrollador — ver CLAUDE.md, este era un pendiente marcado
-- explícitamente para no inventar niveles sin confirmar.
--
-- issue #91: esta migración SÍ se aplicó al proyecto real (21 sep 2026) pero
-- nunca quedó guardada como archivo en el repo — se reconstruyó leyendo
-- `supabase_migrations.schema_migrations` del proyecto real. Contenido
-- textual idéntico al aplicado, mismo version/nombre.

alter table public.perfiles_admin drop constraint perfiles_admin_nivel_permiso_check;
alter table public.perfiles_admin add constraint perfiles_admin_nivel_permiso_check
  check (nivel_permiso in ('admin_total', 'editor'));

-- Helper: admin_total activo (gestión de otros admins, acciones de más alcance).
create or replace function public.es_admin_total()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfiles_admin
    where id = auth.uid() and activo = true and nivel_permiso = 'admin_total'
  );
$$;

-- Dueño real del artículo (distinto de autor_texto/autor_uid, que son el
-- byline público y pueden decir cualquier cosa). NULL en artículos ya
-- existentes = solo admin_total puede tocarlos, ningún editor "hereda" dueño.
alter table public.articulos add column if not exists creado_por uuid references auth.users(id) default auth.uid();

-- articulos: UPDATE/DELETE ahora exige admin_total o ser el dueño.
drop policy "solo admins actualizan articulos" on public.articulos;
create policy "admins actualizan articulos propios o admin_total"
  on public.articulos for update
  using (es_admin_total() or creado_por = auth.uid())
  with check (es_admin_total() or creado_por = auth.uid());

drop policy "solo admins borran articulos" on public.articulos;
create policy "admins borran articulos propios o admin_total"
  on public.articulos for delete
  using (es_admin_total() or creado_por = auth.uid());

-- INSERT: cualquier admin activo puede crear, pero SIEMPRE queda como dueño
-- él mismo (evita que alguien fuerce creado_por a nombre de otro usuario).
drop policy "solo admins crean articulos" on public.articulos;
create policy "admins crean articulos propios"
  on public.articulos for insert
  with check (is_admin() and creado_por = auth.uid());

-- articulos_categorias: mismo criterio de dueño, referenciando el artículo.
drop policy "solo admins asignan categorias a articulos" on public.articulos_categorias;
create policy "asignan categorias segun dueño"
  on public.articulos_categorias for insert
  with check (
    es_admin_total() or exists (
      select 1 from public.articulos a where a.id = articulo_id and a.creado_por = auth.uid()
    )
  );

drop policy "solo admins quitan categorias de articulos" on public.articulos_categorias;
create policy "quitan categorias segun dueño"
  on public.articulos_categorias for delete
  using (
    es_admin_total() or exists (
      select 1 from public.articulos a where a.id = articulo_id and a.creado_por = auth.uid()
    )
  );
