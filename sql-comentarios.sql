-- Comentarios de Facebook (página) e Instagram, para responderlos desde el panel
create table if not exists comentarios (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  red text not null check (red in ('facebook', 'instagram')),
  cuenta_id text not null,
  comentario_id text not null unique,
  post_id text,
  padre_id text,
  post_link text,
  post_texto text,
  autor_id text,
  autor_nombre text,
  texto text not null default '',
  atendido boolean not null default false,
  respuesta text,
  respuesta_privada boolean,
  respondido_en timestamptz,
  respondido_por uuid references perfiles(id) on delete set null,
  error text
);
create index if not exists comentarios_fecha on comentarios (creado_en desc);
alter table comentarios enable row level security;
