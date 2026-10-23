-- Mostrar u ocultar los precios de cada desarrollo en la web.
-- Corré esto en Supabase → SQL Editor. Es seguro correrlo más de una vez.
-- Por defecto todos siguen mostrando precios; se cambia desde Admin → Desarrollos.
alter table proyectos add column if not exists mostrar_precios boolean not null default true;
