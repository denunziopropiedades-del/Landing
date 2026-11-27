-- ═══════════════════════════════════════════════════════════════════════
-- Bandeja de mensajes (WhatsApp + Messenger) dentro del panel.
-- Correr una vez en Supabase → SQL Editor.
--
-- Los mensajes llegan por los webhooks oficiales de Meta:
--   · WhatsApp  → /api/meta/whatsapp        (WhatsApp Cloud API, con "coexistencia")
--   · Messenger → /api/leads/meta-webhook   (mismo webhook de la página que ya recibe los leads)
-- y se responden desde /admin/mensajes.
-- ═══════════════════════════════════════════════════════════════════════

-- Cada número de WhatsApp o página de Facebook conectada. Se crean solos con el
-- primer mensaje que llega (no hace falta cargarlos a mano).
create table if not exists mensajes_canales (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  tipo text not null check (tipo in ('whatsapp', 'messenger')),
  -- WhatsApp: phone_number_id de Meta. Messenger: id de la página.
  external_id text not null unique,
  nombre text not null default '',
  -- Número visible (ej. 5491127424512) para WhatsApp.
  numero text,
  activo boolean not null default true
);

-- Una conversación = un cliente en un canal.
create table if not exists conversaciones (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  canal_id uuid not null references mensajes_canales(id) on delete cascade,
  -- WhatsApp: wa_id (teléfono con 549…). Messenger: PSID del usuario.
  contacto_id text not null,
  nombre text not null default '',
  telefono text,
  lead_id uuid references leads(id) on delete set null,
  ultimo_texto text not null default '',
  ultimo_mensaje_en timestamptz,
  -- Último mensaje DEL CLIENTE: define la ventana de 24 h en la que se puede responder.
  ultimo_entrante_en timestamptz,
  no_leidos integer not null default 0,
  archivada boolean not null default false,
  unique (canal_id, contacto_id)
);

create index if not exists conversaciones_orden_idx on conversaciones (ultimo_mensaje_en desc nulls last);
create index if not exists conversaciones_lead_idx on conversaciones (lead_id);

create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  direccion text not null check (direccion in ('entrante', 'saliente')),
  -- text, image, document, audio, video, sticker, location, otro
  tipo text not null default 'text',
  texto text not null default '',
  -- WhatsApp: id del archivo en Meta (se descarga por /api/admin/mensajes/media). Messenger: url directa.
  media_id text,
  media_url text,
  -- Id del mensaje en Meta (wamid / mid), para no duplicar y para actualizar el estado.
  external_id text,
  -- recibido | enviado | entregado | leido | error
  estado text not null default 'recibido',
  error text,
  -- Quién respondió desde el panel (null = cliente, o respuesta hecha desde el celular).
  enviado_por uuid references perfiles(id) on delete set null,
  -- 'panel' | 'celular' (respuesta hecha desde la app de WhatsApp Business o Meta Business Suite)
  enviado_desde text
);

create unique index if not exists mensajes_external_idx on mensajes (external_id) where external_id is not null;
create index if not exists mensajes_conv_idx on mensajes (conversacion_id, creado_en);

-- Respuestas rápidas (botones arriba del cuadro de texto).
create table if not exists respuestas_rapidas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  titulo text not null,
  texto text not null,
  orden integer not null default 0
);

insert into respuestas_rapidas (titulo, texto, orden)
select * from (values
  ('📍 Ubicación', 'Te paso la ubicación y toda la info del desarrollo acá: https://matulotes.app', 1),
  ('💲 Precios y cuotas', 'Te comparto precios, anticipo y planes de cuotas actualizados: https://matulotes.app — Cualquier duda me escribís.', 2),
  ('🗓 Agendar visita', '¿Qué día y horario te queda cómodo para ir a ver los lotes? Coordinamos la visita sin compromiso.', 3),
  ('📄 Requisitos reserva', 'Para reservar necesitamos DNI y la seña. La reserva se firma online y te enviamos el comprobante.', 4)
) as v(titulo, texto, orden)
where not exists (select 1 from respuestas_rapidas);

-- Solo el servidor (service role) lee y escribe estas tablas; el panel pasa por
-- acciones que validan el rol. Con RLS activo y sin políticas, nadie más accede.
alter table mensajes_canales enable row level security;
alter table conversaciones enable row level security;
alter table mensajes enable row level security;
alter table respuestas_rapidas enable row level security;

-- Conexión de números de WhatsApp Business desde el panel (coexistencia, botón "Conectar WhatsApp Business").
alter table mensajes_canales add column if not exists waba_id text;
alter table mensajes_canales add column if not exists access_token text;
alter table mensajes_canales add column if not exists token_vence timestamptz;
alter table mensajes_canales add column if not exists conectado_en timestamptz;

-- Instagram (mensajes directos) como tercer canal de la bandeja.
alter table mensajes_canales drop constraint if exists mensajes_canales_tipo_check;
alter table mensajes_canales add constraint mensajes_canales_tipo_check check (tipo in ('whatsapp', 'messenger', 'instagram'));
