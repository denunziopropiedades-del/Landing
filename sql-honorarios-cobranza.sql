-- Honorarios de gestión de cobranza: monto fijo por cuota que cobra el
-- comercializador y que se descuenta de la cuota (el resto va a la desarrolladora).
-- Se carga por cliente, en pesos o en dólares.
--
-- Corré esto en Supabase → SQL Editor.

alter table leads add column if not exists honorario_cobranza numeric;
alter table leads add column if not exists honorario_cobranza_moneda text not null default 'USD'
  check (honorario_cobranza_moneda in ('USD', 'ARS'));
