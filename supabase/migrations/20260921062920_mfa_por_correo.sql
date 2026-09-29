-- issue #91: reconstruida desde schema_migrations del proyecto real, nunca
-- se había guardado como archivo. Contenido idéntico al aplicado.

-- MFA propio por correo (issue #17) en vez del TOTP nativo de Supabase —
-- más simple para el dueño (sin apps de autenticador ni QR) y permite
-- "recordar este dispositivo" un tiempo, cosa que el MFA nativo de Supabase
-- no soporta.

-- Opt-in para admin_total/editor (para dueño es obligatorio sin importar
-- este valor, ver adminGuard). Autoservicio: el propio dueño de la fila
-- puede prenderlo/apagarlo para SU cuenta.
alter table public.perfiles_admin add column mfa_activo boolean not null default false;
grant update (mfa_activo) on public.perfiles_admin to authenticated;

create table public.mfa_codigos (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  codigo text not null,
  expira_en timestamptz not null,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.mfa_codigos enable row level security;
-- Sin policies: nadie entra directo desde el cliente, solo las Edge
-- Functions con service_role (igual que intentos_publicos).

create index mfa_codigos_admin_id_idx on public.mfa_codigos (admin_id, usado);
