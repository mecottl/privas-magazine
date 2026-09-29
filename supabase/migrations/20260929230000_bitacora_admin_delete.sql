-- Permite borrar filas de la bitácora (issue reportada en vivo: no había
-- forma de limpiarla). Mismo criterio que la lectura (migración
-- 20260922010000_bitacora_admin.sql): dueño/admin_total, un editor no la ve
-- ni la toca.
create policy "bitacora_delete_admin_total"
  on public.bitacora_admin
  for delete
  to authenticated
  using (public.es_admin_total() or public.es_dueno());
