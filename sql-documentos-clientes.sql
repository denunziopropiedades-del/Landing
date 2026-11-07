-- Módulo de documentos para clientes: reservas y certificados de libre deuda,
-- con link privado (solo se guarda el hash del token), verificación pública por
-- código/QR, aceptación con código de un solo uso y auditoría de eventos.

create table if not exists doc_numeracion (
  tipo text not null,
  anio integer not null,
  ultimo integer not null default 0,
  primary key (tipo, anio)
);

create table if not exists doc_emitidos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('reserva', 'libre_deuda')),
  numero text not null unique,
  codigo_verificacion text not null unique,
  version integer not null default 1,
  estado text not null default 'emitido'
    check (estado in ('emitido', 'enviado', 'aceptado', 'rechazado', 'vencido', 'anulado')),
  lead_id uuid references leads(id) on delete set null,
  alq_contrato_id uuid references alq_contratos(id) on delete set null,
  cliente_nombre text not null,
  cliente_email text,
  cliente_telefono text,
  cliente_dni text,
  datos jsonb not null default '{}'::jsonb,
  acepta_habilitada boolean not null default false,
  vence_en date,
  pdf_path text,
  pdf_sha256 text,
  emitido_en timestamptz not null default now(),
  emitido_por_email text,
  anulado_en timestamptz,
  anulado_motivo text
);
create index if not exists doc_emitidos_fecha_idx on doc_emitidos (emitido_en desc);
create index if not exists doc_emitidos_lead_idx on doc_emitidos (lead_id);

create table if not exists doc_links (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references doc_emitidos(id) on delete cascade,
  token_hash text not null unique,
  canal text,
  creado_en timestamptz not null default now(),
  creado_por_email text,
  vence_en timestamptz not null,
  revocado_en timestamptz,
  accesos integer not null default 0,
  ultimo_acceso_en timestamptz
);
create index if not exists doc_links_doc_idx on doc_links (documento_id);

create table if not exists doc_otp (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references doc_emitidos(id) on delete cascade,
  link_id uuid references doc_links(id) on delete cascade,
  codigo_hash text not null,
  enviado_a text not null,
  creado_en timestamptz not null default now(),
  vence_en timestamptz not null,
  intentos integer not null default 0,
  usado_en timestamptz
);
create index if not exists doc_otp_doc_idx on doc_otp (documento_id, creado_en desc);

create table if not exists doc_decisiones (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references doc_emitidos(id) on delete cascade,
  decision text not null check (decision in ('aceptado', 'rechazado')),
  version integer not null,
  pdf_sha256 text,
  email_verificado text,
  consentimiento text,
  motivo text,
  ip text,
  user_agent text,
  creado_en timestamptz not null default now()
);

create table if not exists doc_eventos (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references doc_emitidos(id) on delete cascade,
  tipo text not null,
  detalle jsonb not null default '{}'::jsonb,
  actor text,
  creado_en timestamptz not null default now()
);
create index if not exists doc_eventos_doc_idx on doc_eventos (documento_id, creado_en desc);

-- Número correlativo por tipo y año (RES-2026-000001 / LD-2026-000001), sin saltos por concurrencia.
create or replace function doc_siguiente_numero(p_tipo text, p_anio integer) returns integer
language plpgsql as $$
declare n integer;
begin
  insert into doc_numeracion (tipo, anio, ultimo) values (p_tipo, p_anio, 1)
  on conflict (tipo, anio) do update set ultimo = doc_numeracion.ultimo + 1
  returning ultimo into n;
  return n;
end $$;

-- Solo el servidor (service role) accede: el panel y el portal pasan por la API.
alter table doc_numeracion enable row level security;
alter table doc_emitidos enable row level security;
alter table doc_links enable row level security;
alter table doc_otp enable row level security;
alter table doc_decisiones enable row level security;
alter table doc_eventos enable row level security;

-- PDFs emitidos (privados: se sirven solo a través del link del cliente o del panel).
insert into storage.buckets (id, name, public) values ('documentos-clientes', 'documentos-clientes', false)
on conflict (id) do nothing;
