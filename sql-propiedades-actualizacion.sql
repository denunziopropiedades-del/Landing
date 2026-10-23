-- Actualización de propiedades: financiación directa, escritura / derechos de posesión
-- y visitas a propiedades (no solo a desarrollos).
-- Corré esto en Supabase → SQL Editor. Es seguro correrlo más de una vez.
alter table propiedades add column if not exists financiacion_directa boolean not null default false;
alter table propiedades add column if not exists situacion_dominial text check (situacion_dominial in ('escritura', 'posesion'));
alter table visitas add column if not exists propiedad_id uuid references propiedades(id) on delete set null;

-- Nuevos tipos: naves industriales / galpones y lotes comerciales.
alter table propiedades drop constraint if exists propiedades_tipo_check;
alter table propiedades add constraint propiedades_tipo_check
  check (tipo in ('casa', 'departamento', 'ph', 'local', 'galpon', 'terreno', 'lote_comercial', 'campo', 'chacra'));

-- Barrio cerrado o abierto.
alter table propiedades add column if not exists tipo_barrio text check (tipo_barrio in ('cerrado', 'abierto'));
