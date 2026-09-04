-- Newsletter / suscripción por correo (CLAUDE.md → tabla de Edge Functions).
-- Migración NUEVA — no toca el esquema base ya aplicado.
-- Reutiliza is_admin() para las políticas de escritura/lectura de admin.

create table if not exists public.suscriptores_newsletter (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  activo             boolean not null default false,
  token_confirmacion uuid not null default gen_random_uuid(),
  fecha_alta         timestamptz not null default now()
);

alter table public.suscriptores_newsletter enable row level security;

-- INSERT público: cualquiera puede suscribirse (doble opt-in después).
create policy "suscriptores_insert_publico"
  on public.suscriptores_newsletter
  for insert
  to anon, authenticated
  with check (true);

-- SELECT solo admin: nunca exponer la lista completa de correos.
create policy "suscriptores_select_admin"
  on public.suscriptores_newsletter
  for select
  to authenticated
  using (public.is_admin());

-- UPDATE/DELETE solo admin desde el cliente. Las Edge Functions públicas
-- (confirmar/cancelar) usan service_role y bypassan RLS.
create policy "suscriptores_update_admin"
  on public.suscriptores_newsletter
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "suscriptores_delete_admin"
  on public.suscriptores_newsletter
  for delete
  to authenticated
  using (public.is_admin());

create index if not exists suscriptores_token_idx
  on public.suscriptores_newsletter (token_confirmacion);
