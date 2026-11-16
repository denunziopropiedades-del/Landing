-- Tasador online (/tasador) y contrato de tasación y autorización de venta.
--
-- tasador_valores: valor de referencia por partido (USD/m² de lote, de casa,
--   de departamento y USD/ha de campo). Se editan desde el panel: Tasador → Valores por zona.
--   Si un partido no está cargado, el tasador usa los valores iniciales del código.
-- tasaciones: cada pedido que entra desde /tasador, con el resultado automático,
--   el informe comparativo que aprueba la inmobiliaria y el link privado del informe.
-- doc_emitidos: se habilita el tipo 'autorizacion_venta' (numeración AV-AAAA-000001).
--
-- Correr una sola vez en Supabase > SQL Editor (requiere sql-documentos-clientes.sql).

create table if not exists tasador_valores (
  partido text primary key,
  lote_m2 numeric,
  casa_m2 numeric,
  depto_m2 numeric,
  campo_ha numeric,
  actualizado_en timestamptz not null default now(),
  actualizado_por text
);

create table if not exists tasaciones (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  nombre text not null,
  telefono text not null,
  email text,
  tipo text not null,
  partido text not null,
  localidad text,
  direccion text,
  datos jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'informe_enviado', 'autorizada', 'descartada')),
  notas text,
  informe jsonb,
  informe_token text unique,
  informe_aprobado_en timestamptz,
  lead_id uuid references leads(id) on delete set null,
  doc_id uuid references doc_emitidos(id) on delete set null
);

create index if not exists tasaciones_creado_en_idx on tasaciones (creado_en desc);

-- Solo el servidor (service role) lee y escribe estas tablas.
alter table tasador_valores enable row level security;
alter table tasaciones enable row level security;

-- Nuevo tipo de documento con aceptación online: autorización de venta.
alter table doc_emitidos drop constraint if exists doc_emitidos_tipo_check;
alter table doc_emitidos add constraint doc_emitidos_tipo_check
  check (tipo in ('reserva', 'libre_deuda', 'autorizacion_venta'));
