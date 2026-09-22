-- Vista previa de borrador para artículos (issue #75).
-- Migración NUEVA — no toca el esquema base ya aplicado.
--
-- Sin política de RLS nueva a propósito: el acceso público por token pasa
-- por la Edge Function `obtener-articulo-preview` con `service_role`, que
-- valida el token explícitamente en código — no expone una policy de
-- lectura pública adicional sobre `articulos`.

alter table public.articulos
  add column if not exists token_preview uuid not null default gen_random_uuid();

create index if not exists articulos_token_preview_idx
  on public.articulos (token_preview);
