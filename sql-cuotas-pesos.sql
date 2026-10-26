-- Cuotas en pesos.
-- 1) Planes en pesos: la moneda se guarda dentro de leads.plan_financiacion
--    ({"moneda":"ARS", ...}); no hace falta columna nueva. En la tabla cuotas,
--    monto_usd / monto_pagado_usd guardan el monto en la moneda del plan.
-- 2) Cuotas en dólares pagadas en pesos: se registran los pesos recibidos y el
--    tipo de cambio usado.
--
-- Corré esto en Supabase → SQL Editor.

alter table cuotas add column if not exists monto_pagado_ars numeric;
alter table cuotas add column if not exists cotizacion numeric;
