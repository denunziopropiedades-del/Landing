-- Actualización de propiedades: financiación directa, escritura / derechos de posesión
-- y visitas a propiedades (no solo a desarrollos).
-- Corré esto en Supabase → SQL Editor. Es seguro correrlo más de una vez.
alter table propiedades add column if not exists financiacion_directa boolean not null default false;
alter table propiedades add column if not exists situacion_dominial text check (situacion_dominial in ('escritura', 'posesion'));
alter table visitas add column if not exists propiedad_id uuid references propiedades(id) on delete set null;
