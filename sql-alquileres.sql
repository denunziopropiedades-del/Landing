-- Administración de alquileres
--
-- alq_personas:      propietarios e inquilinos (cada uno con un link privado para ver su cuenta).
-- alq_contratos:     contrato de alquiler: propiedad, propietario, inquilino, garantes, fechas,
--                    monto actual (se actualiza a mano en cada ajuste), comisión de administración.
-- alq_cuotas:        el alquiler de cada mes: vencimiento, monto, punitorios, pago y recibo.
-- alq_servicios:     expensas, ABL, luz, gas, agua, etc.: quién lo paga y si está al día.
-- alq_liquidaciones: lo que se le rinde al propietario por cada cobro (menos comisión y gastos).
--
-- Solo el servidor (service role) lee y escribe estas tablas: inquilinos y propietarios
-- ven su información a través de su link privado, nunca directo contra la base.
--
-- Correr una sola vez en Supabase > SQL Editor. Se puede volver a correr sin romper nada.

create table if not exists alq_personas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  tipo text not null check (tipo in ('propietario', 'inquilino')),
  nombre text not null,
  dni text,
  cuit text,
  email text,
  telefono text,
  domicilio text,
  cbu_alias text,
  notas text,
  token text not null unique default replace(gen_random_uuid()::text, '-', '')
);

create table if not exists alq_contratos (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  propiedad_id uuid references propiedades(id) on delete set null,
  direccion text not null,
  localidad text,
  propietario_id uuid not null references alq_personas(id) on delete restrict,
  inquilino_id uuid not null references alq_personas(id) on delete restrict,
  garantes text,
  fecha_inicio date not null,
  fecha_fin date not null,
  moneda text not null default 'ARS' check (moneda in ('ARS', 'USD')),
  monto_actual numeric not null check (monto_actual >= 0),
  dia_vencimiento integer not null default 10 check (dia_vencimiento between 1 and 28),
  comision_admin_pct numeric not null default 0 check (comision_admin_pct >= 0 and comision_admin_pct <= 100),
  punitorio_diario_pct numeric not null default 0 check (punitorio_diario_pct >= 0),
  deposito numeric,
  proximo_ajuste date,
  ajuste_detalle text,
  estado text not null default 'activo' check (estado in ('activo', 'finalizado', 'rescindido')),
  notas text
);

create table if not exists alq_cuotas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  contrato_id uuid not null references alq_contratos(id) on delete cascade,
  periodo date not null,
  vencimiento date not null,
  monto numeric not null check (monto >= 0),
  extras numeric not null default 0,
  extras_detalle text,
  punitorios numeric not null default 0,
  pagado_monto numeric,
  pagado_en date,
  medio_pago text check (medio_pago in ('efectivo', 'transferencia', 'mercadopago')),
  mp_link text,
  mp_pago_id text,
  recibo_numero integer,
  liquidacion_id uuid,
  notas text,
  unique (contrato_id, periodo)
);

create sequence if not exists alq_recibo_seq start 1;

create table if not exists alq_servicios (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  contrato_id uuid not null references alq_contratos(id) on delete cascade,
  concepto text not null,
  a_cargo text not null default 'inquilino' check (a_cargo in ('inquilino', 'propietario')),
  periodo date,
  vencimiento date,
  monto numeric,
  pagado boolean not null default false,
  pagado_en date,
  notas text
);

create table if not exists alq_liquidaciones (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  contrato_id uuid not null references alq_contratos(id) on delete cascade,
  propietario_id uuid not null references alq_personas(id) on delete restrict,
  periodo date not null,
  cobrado numeric not null default 0,
  comision numeric not null default 0,
  gastos numeric not null default 0,
  gastos_detalle text,
  neto numeric not null default 0,
  pagada_en date,
  medio_pago text,
  notas text
);

do $$ begin
  alter table alq_cuotas add constraint alq_cuotas_liquidacion_fk
    foreign key (liquidacion_id) references alq_liquidaciones(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists alq_cuotas_contrato_idx on alq_cuotas (contrato_id, periodo);
create index if not exists alq_cuotas_vencimiento_idx on alq_cuotas (vencimiento) where pagado_en is null;
create index if not exists alq_servicios_contrato_idx on alq_servicios (contrato_id);
create index if not exists alq_liquidaciones_contrato_idx on alq_liquidaciones (contrato_id, periodo);

alter table alq_personas enable row level security;
alter table alq_contratos enable row level security;
alter table alq_cuotas enable row level security;
alter table alq_servicios enable row level security;
alter table alq_liquidaciones enable row level security;

-- Número de recibo correlativo (se asigna al registrar el pago).
create or replace function alq_siguiente_recibo() returns integer
language sql as $$ select nextval('alq_recibo_seq')::integer $$;
