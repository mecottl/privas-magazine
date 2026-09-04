-- "Nuestras Marcas": más datos por marca.
--
--   descripcion    : texto corto opcional para la ficha.
--   sitio_web_url  : link PRINCIPAL al sitio propio de la marca (ej. Privas
--                    Travel tiene su web independiente). Es el CTA destacado,
--                    distinto de los íconos de redes sociales — por eso va
--                    aparte de `enlaces`.
--   enlaces        : lista flexible de redes sociales, formato
--                    [{ "tipo": "instagram", "url": "..." }, ...].
--
-- `red_social_url` NO se elimina: solo se quita su NOT NULL por compatibilidad
-- con las filas y el frontend actuales. Se podrá borrar del todo cuando la UI
-- ya no la use.

alter table public.marcas
  add column if not exists descripcion   text,
  add column if not exists sitio_web_url text,
  add column if not exists enlaces       jsonb not null default '[]'::jsonb;

alter table public.marcas alter column red_social_url drop not null;
