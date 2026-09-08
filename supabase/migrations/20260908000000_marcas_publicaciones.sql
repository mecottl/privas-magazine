-- "Últimas publicaciones" de cada marca (tira del linktree en /marcas).
-- Formato de cada elemento: { "imagen_url": text, "enlace": text, "texto"?: text }
-- Se llena a mano desde el panel; el mismo formato lo puede poblar luego
-- una Edge Function contra la API de Instagram (ver comentario del issue #10).

alter table public.marcas
  add column if not exists publicaciones jsonb not null default '[]'::jsonb;

comment on column public.marcas.publicaciones is
  'Publicaciones destacadas: [{ imagen_url, enlace, texto? }]. Manual hoy; automatizable vía Instagram API.';
