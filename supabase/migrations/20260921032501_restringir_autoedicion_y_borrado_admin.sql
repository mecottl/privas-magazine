-- issue #91: reconstruida desde schema_migrations del proyecto real, nunca
-- se había guardado como archivo. Contenido idéntico al aplicado.

-- La policy RLS "un admin puede editar su propio nombre visible" solo exige
-- id = auth.uid(), pero hoy authenticated tiene GRANT de UPDATE sobre TODAS
-- las columnas de la fila -- cualquier admin logueado podría, desde la consola
-- del navegador, hacer update({ nivel_permiso: 'admin_total', activo: true })
-- sobre su propia fila y auto-promoverse. Restringimos a nivel de columna:
-- el cliente solo puede tocar nombre_visible; nivel_permiso/activo siguen
-- siendo exclusivos de las Edge Functions con service_role.
revoke update on public.perfiles_admin from authenticated;
grant update (nombre_visible) on public.perfiles_admin to authenticated;

-- Al eliminar una cuenta de admin (set-admin-activo con eliminar:true), sus
-- artículos no deben bloquear el borrado ni desaparecer: quedan sin dueño
-- (creado_por = null), igual que el contenido histórico ya existente -- solo
-- admin_total puede tocarlos después.
alter table public.articulos drop constraint articulos_creado_por_fkey;
alter table public.articulos add constraint articulos_creado_por_fkey
  foreign key (creado_por) references auth.users(id) on delete set null;
