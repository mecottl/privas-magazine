-- issue #91: reconstruida desde schema_migrations del proyecto real, nunca
-- se había guardado como archivo. Dato, no esquema — pone en 'dueno' a la
-- primera cuenta (la de la clienta) justo después de agregar ese nivel.
update public.perfiles_admin set nivel_permiso = 'dueno' where id = '94362bc3-f28f-4605-96d1-f2edcdf03d52';
