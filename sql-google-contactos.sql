-- Guardar automáticamente los clientes en Google Contactos ("Nombre Apellido Cte web").
create table if not exists google_contactos_config (
  id integer primary key default 1 check (id = 1),
  refresh_token text not null,
  cuenta_email text,
  conectado_en timestamptz not null default now()
);
alter table google_contactos_config enable row level security;
alter table leads add column if not exists google_contacto_id text;
alter table leads add column if not exists google_contacto_error text;
