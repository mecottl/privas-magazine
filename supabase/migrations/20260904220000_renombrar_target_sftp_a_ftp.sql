-- Renombra el valor 'sftp' -> 'ftp' en las columnas *_target.
--
-- Contexto: la migración 20260903120000_archivos_path_target.sql se aplicó
-- pensando en Hostinger (SFTP real). El 4 sep 2026 se decidió usar Akky en
-- su lugar, que confirmó que NO tiene SFTP, solo FTP plano vía cPanel. El
-- código de las Edge Functions (subir-archivo, eliminar-archivo) ya se migró
-- de 'sftp' a 'ftp'; esta migración alinea la base de datos.
--
-- No se reescribe la migración original (ya aplicada en producción) — se
-- agrega esta como ALTER nuevo, según la regla de CLAUDE.md.
--
-- Nota: en la práctica no debería haber filas con target = 'sftp' todavía,
-- porque esa rama nunca se probó en vivo (no existía Hostinger real). El
-- UPDATE es solo por seguridad, en caso de que sí exista alguna.

update public.articulos
  set imagen_portada_target = 'ftp'
  where imagen_portada_target = 'sftp';

update public.ediciones_revista
  set pdf_target = 'ftp'
  where pdf_target = 'sftp';

update public.ediciones_revista
  set portada_target = 'ftp'
  where portada_target = 'sftp';

alter table public.articulos
  drop constraint if exists articulos_imagen_portada_target_check;
alter table public.articulos
  add constraint articulos_imagen_portada_target_check
  check (imagen_portada_target in ('supabase', 'ftp'));

alter table public.ediciones_revista
  drop constraint if exists ediciones_revista_pdf_target_check;
alter table public.ediciones_revista
  add constraint ediciones_revista_pdf_target_check
  check (pdf_target in ('supabase', 'ftp'));

alter table public.ediciones_revista
  drop constraint if exists ediciones_revista_portada_target_check;
alter table public.ediciones_revista
  add constraint ediciones_revista_portada_target_check
  check (portada_target in ('supabase', 'ftp'));
