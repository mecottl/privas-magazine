-- issue #91: reconstruida desde schema_migrations del proyecto real, nunca
-- se había guardado como archivo. Contenido idéntico al aplicado.

-- Tercer nivel de permiso: 'dueno' — poder absoluto (invitar/eliminar/
-- cambiar nivel/restablecer contraseña de cualquier cuenta). 'admin_total'
-- pasa a ser un nivel intermedio: solo invita y gestiona cuentas de
-- 'editor', ya no gestiona otros 'admin_total' ni cambia niveles.
alter table public.perfiles_admin drop constraint perfiles_admin_nivel_permiso_check;
alter table public.perfiles_admin add constraint perfiles_admin_nivel_permiso_check
  check (nivel_permiso in ('dueno', 'admin_total', 'editor'));

create or replace function public.es_dueno()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfiles_admin
    where id = auth.uid() and activo = true and nivel_permiso = 'dueno'
  );
$$;

-- El dueño tiene el mismo acceso total a artículos que admin_total.
drop policy "admins actualizan articulos propios o admin_total" on public.articulos;
create policy "admins actualizan articulos propios o elevados"
  on public.articulos for update
  using (es_admin_total() or es_dueno() or creado_por = auth.uid())
  with check (es_admin_total() or es_dueno() or creado_por = auth.uid());

drop policy "admins borran articulos propios o admin_total" on public.articulos;
create policy "admins borran articulos propios o elevados"
  on public.articulos for delete
  using (es_admin_total() or es_dueno() or creado_por = auth.uid());

-- Renombradas de paso: "segun dueño" en el nombre viejo se refería al dueño
-- DEL ARTÍCULO (creado_por), no al nuevo rol — para no confundir a futuro.
drop policy "asignan categorias segun dueño" on public.articulos_categorias;
create policy "asignan categorias segun autor o elevados"
  on public.articulos_categorias for insert
  with check (
    es_admin_total() or es_dueno() or exists (
      select 1 from public.articulos a where a.id = articulo_id and a.creado_por = auth.uid()
    )
  );

drop policy "quitan categorias segun dueño" on public.articulos_categorias;
create policy "quitan categorias segun autor o elevados"
  on public.articulos_categorias for delete
  using (
    es_admin_total() or es_dueno() or exists (
      select 1 from public.articulos a where a.id = articulo_id and a.creado_por = auth.uid()
    )
  );
