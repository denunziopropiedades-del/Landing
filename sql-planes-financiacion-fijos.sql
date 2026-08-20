-- Agrega la columna para guardar hasta 3 planes de financiación a monto fijo
-- (anticipo en USD + cantidad de cuotas + valor de cuota en USD) por proyecto,
-- independientes de la calculadora por porcentaje que ya existía.
--
-- Corré esto en Supabase → SQL Editor.

alter table financiacion_config
  add column if not exists planes_fijos jsonb not null default '[]'::jsonb;
