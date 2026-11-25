-- Facturación electrónica con ARCA (Factura C / Nota de Crédito C por WSFEv1).
-- Corré esto en Supabase → SQL Editor (ya aplicado en el proyecto MATU LOTES).

-- Datos del emisor y opciones (una sola fila, id = 1).
create table if not exists arca_config (
  id int primary key default 1 check (id = 1),
  cuit text not null default '20329177921',
  razon_social text not null default 'DE NUNZIO MATIAS JAVIER',
  nombre_fantasia text not null default 'DE NUNZIO NEGOCIOS INMOBILIARIOS',
  domicilio text,
  iibb text,
  inicio_actividades date,
  condicion_iva text not null default 'Responsable Monotributo',
  matricula text default 'Martillero y Corredor Público · COL 7886',
  punto_venta int not null default 8,
  entorno text not null default 'homologacion' check (entorno in ('homologacion', 'produccion')),
  emision_automatica boolean not null default false,
  tope_identificacion numeric not null default 10000000,
  telefonos text default '11-2742-4512 · 11-6136-5523',
  web text default 'matulotes.app',
  actualizado_en timestamptz not null default now()
);
insert into arca_config (id) values (1) on conflict (id) do nothing;

-- Ticket de acceso del WSAA (dura ~12 h; se comparte entre funciones serverless).
create table if not exists arca_tokens (
  clave text primary key,
  token text not null,
  sign text not null,
  expira_en timestamptz not null
);

create table if not exists arca_facturas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviando', 'autorizada', 'rechazada', 'descartada')),
  entorno text not null default 'homologacion' check (entorno in ('homologacion', 'produccion')),
  -- Origen: manual (botón ARCA - FACTURAS) o automático desde un cobro.
  origen text not null default 'manual' check (origen in ('manual', 'sena', 'honorario_cuota', 'alquiler', 'otro')),
  -- Clave única del cobro que la generó (ej. "cuota:<id>", "sena:<id>"): evita facturar dos veces el mismo pago.
  origen_ref text unique,
  lead_id uuid references leads(id) on delete set null,
  tipo_cbte int not null default 11 check (tipo_cbte in (11, 13)),
  punto_venta int not null default 8,
  numero int,
  fecha date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  concepto int not null default 2,
  periodo_desde date,
  periodo_hasta date,
  vto_pago date,
  receptor_doc_tipo int not null default 99,
  receptor_doc_nro text not null default '0',
  receptor_nombre text not null default 'Consumidor final',
  receptor_domicilio text,
  receptor_email text,
  receptor_telefono text,
  receptor_condicion_iva int not null default 5,
  moneda text not null default 'PES' check (moneda in ('PES', 'DOL')),
  cotizacion numeric not null default 1,
  cotizacion_fecha text,
  cancela_misma_moneda boolean not null default true,
  items jsonb not null default '[]'::jsonb,
  importe_total numeric not null default 0,
  medio_pago text,
  concepto_tipo text,
  cae text,
  cae_vto date,
  factura_asociada_id uuid references arca_facturas(id),
  errores jsonb,
  observaciones jsonb,
  respuesta_xml text,
  token_publico text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') unique,
  creado_por text,
  emitida_por text,
  emitida_en timestamptz,
  enviada_email_en timestamptz
);

create unique index if not exists arca_facturas_numero_uk
  on arca_facturas (entorno, punto_venta, tipo_cbte, numero) where numero is not null;
create index if not exists arca_facturas_estado_idx on arca_facturas (estado, fecha desc);
create index if not exists arca_facturas_lead_idx on arca_facturas (lead_id);

alter table arca_config enable row level security;
alter table arca_tokens enable row level security;
alter table arca_facturas enable row level security;

drop policy if exists "Admin/supervisor ven config ARCA" on arca_config;
create policy "Admin/supervisor ven config ARCA" on arca_config for select
  using (mi_rol() in ('administrador', 'supervisor'));

drop policy if exists "Admin/supervisor gestionan facturas ARCA" on arca_facturas;
create policy "Admin/supervisor gestionan facturas ARCA" on arca_facturas for select
  using (mi_rol() in ('administrador', 'supervisor'));
-- arca_tokens: sin políticas (solo la service role del servidor).
