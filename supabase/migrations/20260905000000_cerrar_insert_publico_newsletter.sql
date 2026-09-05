-- Rate limiting básico en Edge Functions públicas del newsletter (issue #15).
--
-- El INSERT público directo a `suscriptores_newsletter` permitía spam sin
-- ningún control: se cierra esa policy y el alta pasa por la Edge Function
-- `suscribirse`, que sí puede aplicar rate limiting antes de escribir.

drop policy if exists "suscriptores_insert_publico" on public.suscriptores_newsletter;

-- Registro de intentos por ruta + identificador (IP), usado por
-- `_shared/rate_limit.ts` para las 3 Edge Functions públicas del newsletter
-- (suscribirse, confirmar-suscripcion, cancelar-suscripcion).
create table if not exists public.intentos_publicos (
  id            bigint generated always as identity primary key,
  ruta          text not null,
  identificador text not null,
  creado_en     timestamptz not null default now()
);

create index if not exists intentos_publicos_ruta_id_fecha_idx
  on public.intentos_publicos (ruta, identificador, creado_en);

alter table public.intentos_publicos enable row level security;

-- Sin policies públicas a propósito: esta tabla SOLO se toca con
-- service_role desde las Edge Functions (`adminClient()`), nunca desde el
-- cliente ni con la anon key.
