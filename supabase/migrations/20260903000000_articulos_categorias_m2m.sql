-- Varias categorías por artículo (tabla de unión).
-- Migración NUEVA — el `articulos.categoria_id` original se conserva pero la
-- app deja de usarlo; la fuente de verdad pasa a ser esta tabla.

create table if not exists public.articulos_categorias (
  articulo_id  uuid not null references public.articulos(id)  on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  primary key (articulo_id, categoria_id)
);

alter table public.articulos_categorias enable row level security;

-- Lectura pública: solo son pares de ids; la visibilidad real del artículo la
-- controla la RLS de `articulos`.
create policy "lectura publica de articulos_categorias"
  on public.articulos_categorias for select to public using (true);

create policy "solo admins asignan categorias a articulos"
  on public.articulos_categorias for insert to public with check (public.is_admin());

create policy "solo admins quitan categorias de articulos"
  on public.articulos_categorias for delete to public using (public.is_admin());

create index if not exists articulos_categorias_categoria_idx
  on public.articulos_categorias (categoria_id);

-- Migrar el categoria_id que ya existía en articulos.
insert into public.articulos_categorias (articulo_id, categoria_id)
select id, categoria_id from public.articulos where categoria_id is not null
on conflict do nothing;

-- `articulos.categoria_id` queda obsoleto: la fuente de verdad es la tabla de
-- unión. Se elimina para que PostgREST no tenga dos relaciones a `categorias`.
alter table public.articulos drop column if exists categoria_id;
