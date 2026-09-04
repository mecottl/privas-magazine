-- Limpieza de archivos huérfanos — parte 2: triggers que avisan a la Edge
-- Function `eliminar-archivo` cuando un archivo deja de estar referenciado.
--
-- Patrón idéntico al de `programar-publicacion`: la base de datos llama a una
-- Edge Function vía `pg_net`, autenticándose con el mismo `cron_secret` del
-- Vault (no hace falta un secreto nuevo).
--
--   AFTER DELETE  -> se borró la fila  -> borrar su(s) archivo(s).
--   AFTER UPDATE  -> cambió el *_path  -> se reemplazó el archivo -> borrar el
--                    VIEJO (OLD.*_path). Si el path NO cambió, no se dispara
--                    nada (editar el título de un artículo no toca la imagen).

-- ---------------------------------------------------------------------------
-- Helper: POST a eliminar-archivo con una lista de { path, target }.
-- ---------------------------------------------------------------------------
create or replace function public._eliminar_archivos_remoto(p_archivos jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_archivos is null or jsonb_array_length(p_archivos) = 0 then
    return;
  end if;

  perform net.http_post(
    url := 'https://xiqqhjdpmqdnzsvpjhwq.functions.supabase.co/eliminar-archivo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (select decrypted_secret
                      from vault.decrypted_secrets
                     where name = 'cron_secret')
    ),
    body := jsonb_build_object('archivos', p_archivos)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- articulos.imagen_portada  (un archivo)
-- ---------------------------------------------------------------------------
create or replace function public.tg_limpiar_portada_articulo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path   text;
  v_target text;
begin
  if TG_OP = 'DELETE' then
    v_path   := OLD.imagen_portada_path;
    v_target := OLD.imagen_portada_target;
  elsif TG_OP = 'UPDATE'
        and NEW.imagen_portada_path is distinct from OLD.imagen_portada_path then
    -- el path cambió => se reemplazó la portada => borrar la vieja
    v_path   := OLD.imagen_portada_path;
    v_target := OLD.imagen_portada_target;
  end if;

  if v_path is not null then
    perform public._eliminar_archivos_remoto(
      jsonb_build_array(jsonb_build_object('path', v_path, 'target', v_target))
    );
  end if;

  return null; -- AFTER trigger: el valor de retorno se ignora
end;
$$;

drop trigger if exists articulos_limpiar_portada on public.articulos;
create trigger articulos_limpiar_portada
  after update or delete on public.articulos
  for each row
  execute function public.tg_limpiar_portada_articulo();

-- ---------------------------------------------------------------------------
-- ediciones_revista.pdf + ediciones_revista.portada  (dos archivos)
-- ---------------------------------------------------------------------------
create or replace function public.tg_limpiar_archivos_edicion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archivos jsonb := '[]'::jsonb;
begin
  if TG_OP = 'DELETE' then
    if OLD.pdf_path is not null then
      v_archivos := v_archivos
        || jsonb_build_object('path', OLD.pdf_path, 'target', OLD.pdf_target);
    end if;
    if OLD.portada_path is not null then
      v_archivos := v_archivos
        || jsonb_build_object('path', OLD.portada_path, 'target', OLD.portada_target);
    end if;

  elsif TG_OP = 'UPDATE' then
    if OLD.pdf_path is not null
       and NEW.pdf_path is distinct from OLD.pdf_path then
      v_archivos := v_archivos
        || jsonb_build_object('path', OLD.pdf_path, 'target', OLD.pdf_target);
    end if;
    if OLD.portada_path is not null
       and NEW.portada_path is distinct from OLD.portada_path then
      v_archivos := v_archivos
        || jsonb_build_object('path', OLD.portada_path, 'target', OLD.portada_target);
    end if;
  end if;

  perform public._eliminar_archivos_remoto(v_archivos);
  return null;
end;
$$;

drop trigger if exists ediciones_limpiar_archivos on public.ediciones_revista;
create trigger ediciones_limpiar_archivos
  after update or delete on public.ediciones_revista
  for each row
  execute function public.tg_limpiar_archivos_edicion();
