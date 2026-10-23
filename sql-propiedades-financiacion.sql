-- Propiedades: financiación directa y situación dominial (escritura o derechos de posesión).
-- Corré esto en Supabase → SQL Editor. Es seguro correrlo más de una vez.
alter table propiedades add column if not exists financiacion_directa boolean not null default false;
alter table propiedades add column if not exists situacion_dominial text check (situacion_dominial in ('escritura', 'posesion'));
