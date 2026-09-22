-- Papelera en vez de borrado permanente (issue #77).
-- Migración NUEVA — no toca el esquema base ya aplicado.

alter table public.articulos add column if not exists eliminado_en timestamptz;
alter table public.ediciones_revista add column if not exists eliminado_en timestamptz;

create index if not exists articulos_eliminado_en_idx
  on public.articulos (eliminado_en) where eliminado_en is not null;
create index if not exists ediciones_eliminado_en_idx
  on public.ediciones_revista (eliminado_en) where eliminado_en is not null;

-- La visibilidad pública ahora también exige eliminado_en is null — un
-- admin (is_admin()) sigue viendo todo, incluida la papelera, para poder
-- restaurar o purgar desde el panel.
drop policy "lectura de articulos" on public.articulos;
create policy "lectura de articulos"
  on public.articulos
  for select
  using ((estado = 'publicado' and eliminado_en is null) or is_admin());

drop policy "lectura de ediciones" on public.ediciones_revista;
create policy "lectura de ediciones"
  on public.ediciones_revista
  for select
  using ((estado = 'publicado' and eliminado_en is null) or is_admin());
