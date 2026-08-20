-- Cuotario: seguimiento de cobranzas para clientes que reservan "financiado"
-- con uno de los planes fijos de anticipo/cuotas del proyecto.
--
-- Corré esto en Supabase → SQL Editor.

-- 1) Forma de pago elegida al reservar (contado/financiado) + copia del plan elegido.
alter table leads
  add column if not exists forma_pago text not null default 'contado'
    check (forma_pago in ('contado', 'financiado'));
alter table leads
  add column if not exists plan_financiacion jsonb;

-- 2) Cuotas: se generan desde el CRM una vez que se pacta con el cliente la fecha
-- de la primera cuota (no se crean automáticamente al reservar).
create table if not exists cuotas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  numero int not null,
  monto_usd numeric not null,
  vencimiento date not null,
  pagada boolean not null default false,
  pagado_en timestamptz,
  monto_pagado_usd numeric,
  recordatorio_enviado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (lead_id, numero)
);

create index if not exists cuotas_lead_idx on cuotas (lead_id);
create index if not exists cuotas_vencimiento_idx on cuotas (vencimiento) where pagada = false;

alter table cuotas enable row level security;

drop policy if exists "Admin/supervisor gestionan cuotas" on cuotas;
create policy "Admin/supervisor gestionan cuotas" on cuotas for all
  using (mi_rol() in ('administrador', 'supervisor'));
