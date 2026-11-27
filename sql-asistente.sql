-- Asistente de IA para WhatsApp (bandeja de mensajes)

create table if not exists asistente_config (
  id int primary key default 1 check (id = 1),
  activo boolean not null default false,
  modo text not null default 'borrador' check (modo in ('borrador', 'automatico')),
  canales uuid[] not null default '{}',
  modelo text,
  nombre_asistente text,
  info_negocio text,
  instrucciones text,
  seguimiento_activo boolean not null default false,
  seguimiento_horas int not null default 48,
  seguimiento_max int not null default 2,
  seguimiento_plantilla text,
  seguimiento_idioma text,
  seguimiento_estados text[],
  actualizado_en timestamptz not null default now()
);
alter table asistente_config enable row level security;

create table if not exists asistente_log (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  conversacion_id uuid references conversaciones(id) on delete cascade,
  tipo text,
  salida text,
  acciones jsonb,
  tokens int,
  error text
);
create index if not exists asistente_log_conv on asistente_log (conversacion_id, creado_en desc);
alter table asistente_log enable row level security;

alter table conversaciones
  add column if not exists bot_pausado boolean not null default false,
  add column if not exists atencion text,
  add column if not exists borrador_ia text,
  add column if not exists borrador_en timestamptz,
  add column if not exists seguimientos int not null default 0,
  add column if not exists ultimo_seguimiento_en timestamptz;
