-- Revierte 20260908000000: la tira "Últimas publicaciones" del linktree se
-- descartó (el linktree se queda solo con los enlaces).

alter table public.marcas drop column if exists publicaciones;
