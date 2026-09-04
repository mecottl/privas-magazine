-- Limpieza de archivos huérfanos — parte 1: rastro para poder BORRAR el archivo.
--
-- Las columnas `*_url` sirven para MOSTRAR el archivo, pero no para borrarlo:
-- la ruta interna dentro del bucket/servidor es distinta de la URL final
-- (sobre todo con URLs firmadas). Se guardan además:
--   *_path   : ruta interna usada al subir (la que necesita `storage.remove`
--              o el `DELETE` por SFTP).
--   *_target : destino real de ESA subida ('supabase' | 'sftp'). Importante en
--              la transición a Hostinger: puede haber archivos viejos en
--              Supabase Storage y nuevos en SFTP al mismo tiempo.
--
-- Migración idempotente — las columnas ya podían existir en el proyecto real.

alter table public.articulos
  add column if not exists imagen_portada_path   text,
  add column if not exists imagen_portada_target text;

alter table public.ediciones_revista
  add column if not exists pdf_path      text,
  add column if not exists portada_path  text,
  add column if not exists pdf_target    text,
  add column if not exists portada_target text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'articulos_imagen_portada_target_check'
  ) then
    alter table public.articulos
      add constraint articulos_imagen_portada_target_check
      check (imagen_portada_target in ('supabase', 'sftp'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ediciones_revista_pdf_target_check'
  ) then
    alter table public.ediciones_revista
      add constraint ediciones_revista_pdf_target_check
      check (pdf_target in ('supabase', 'sftp'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ediciones_revista_portada_target_check'
  ) then
    alter table public.ediciones_revista
      add constraint ediciones_revista_portada_target_check
      check (portada_target in ('supabase', 'sftp'));
  end if;
end $$;
