-- Alta de clientes por link (matulotes.app/alta): datos para contratos que
-- completa el propio cliente (domicilio, localidad, partido, nacionalidad,
-- estado civil, CUIT/CUIL).
--
-- Corré esto en Supabase → SQL Editor.

alter table leads add column if not exists datos_contrato jsonb;
