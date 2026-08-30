-- Guarda el link de pago de la seña (Mercado Pago) generado al reservar, para poder
-- reenviarlo por WhatsApp desde el CRM sin tener que generarlo de nuevo.
alter table leads add column if not exists link_pago_sena text;
