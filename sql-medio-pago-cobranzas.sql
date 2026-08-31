-- Agrega el medio de pago (transferencia/efectivo) a cada cuota y a la seña de la
-- reserva, para tener un registro completo de cómo cobra cada cliente financiado.
alter table cuotas add column if not exists medio_pago text check (medio_pago in ('transferencia', 'efectivo'));
alter table leads add column if not exists medio_pago_sena text check (medio_pago_sena in ('transferencia', 'efectivo'));
