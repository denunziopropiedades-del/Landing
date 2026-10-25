-- Newsletter / remarketing por email a las visitas agendadas que no son clientes.
--
-- newsletter_bajas: emails que pidieron no recibir más promociones (link
--   "Darme de baja" al pie de cada newsletter). Nunca se les vuelve a enviar.
-- newsletter_envios: historial de cada newsletter enviado (qué, a dónde
--   llevaba, a cuántos y quién lo mandó).
--
-- Correr una sola vez en Supabase > SQL Editor.

create table if not exists newsletter_bajas (
  email text primary key,
  creado_en timestamptz not null default now()
);

create table if not exists newsletter_envios (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  asunto text not null,
  titulo text,
  imagen_url text,
  link_url text,
  destinatarios integer not null default 0,
  enviados integer not null default 0,
  fallidos integer not null default 0,
  enviado_por uuid references perfiles(id) on delete set null
);

-- Solo el servidor (service role) lee y escribe estas tablas.
alter table newsletter_bajas enable row level security;
alter table newsletter_envios enable row level security;
