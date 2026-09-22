-- Bitácora de acciones del panel admin (issue #76).
-- Migración NUEVA — no toca el esquema base ya aplicado.

create table public.bitacora_admin (
  id uuid primary key default gen_random_uuid(),
  -- on delete set null: si la cuenta se elimina después, no se pierde la
  -- fila del historial — el nombre queda igual guardado en admin_nombre.
  admin_id uuid references auth.users(id) on delete set null,
  admin_nombre text,
  accion text not null,
  tabla text,
  registro_id uuid,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.bitacora_admin enable row level security;

-- Solo dueño/admin_total la leen — un editor no ve qué hicieron los demás.
-- Sin policy de insert/update/delete: solo la escriben las Edge Functions
-- (service_role) y el trigger de abajo (security definer, dueño de la
-- tabla), nunca el cliente directo.
create policy "bitacora_select_admin_total"
  on public.bitacora_admin
  for select
  to authenticated
  using (public.es_admin_total() or public.es_dueno());

create index bitacora_admin_created_at_idx on public.bitacora_admin (created_at desc);

-- Registra publicar/despublicar/programar/regresar-a-borrador y eliminar en
-- articulos/ediciones_revista. Solo cuando hay un admin real detrás
-- (auth.uid() no nulo) — los cambios de programar-publicacion (cron,
-- service_role) no pasan por aquí, esa función ya tiene sus propios logs.
create or replace function public.registrar_bitacora_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quien uuid := auth.uid();
  quien_nombre text;
  accion text;
begin
  if quien is null then
    return coalesce(new, old);
  end if;

  select nombre_visible into quien_nombre from public.perfiles_admin where id = quien;

  if tg_op = 'DELETE' then
    insert into public.bitacora_admin (admin_id, admin_nombre, accion, tabla, registro_id, detalle)
    values (quien, quien_nombre, 'eliminar', tg_table_name, old.id,
      jsonb_build_object('titulo', old.titulo, 'estado', old.estado));
    return old;
  end if;

  if old.estado is distinct from new.estado then
    accion := case new.estado
      when 'publicado' then 'publicar'
      when 'despublicado' then 'despublicar'
      when 'programado' then 'programar'
      when 'borrador' then 'regresar_a_borrador'
      else 'cambiar_estado'
    end;
    insert into public.bitacora_admin (admin_id, admin_nombre, accion, tabla, registro_id, detalle)
    values (quien, quien_nombre, accion, tg_table_name, new.id,
      jsonb_build_object('titulo', new.titulo, 'estado_anterior', old.estado, 'estado_nuevo', new.estado));
  end if;
  return new;
end;
$$;

create trigger bitacora_articulos
  after update or delete on public.articulos
  for each row execute function public.registrar_bitacora_estado();

create trigger bitacora_ediciones
  after update or delete on public.ediciones_revista
  for each row execute function public.registrar_bitacora_estado();
