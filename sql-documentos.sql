-- Contratos y escritos: modelos propios (con campos {{...}}) e historial de documentos generados.
-- Corré esto en Supabase → SQL Editor. Es seguro correrlo más de una vez.

create table if not exists modelos_documento (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  nombre text not null,
  categoria text not null default 'Contratos',
  cuerpo text not null
);

create table if not exists documentos_generados (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  creado_por uuid references perfiles(id) on delete set null,
  creado_por_email text,
  modelo_id text not null,          -- id del modelo (uuid propio o id de un modelo incorporado)
  modelo_nombre text not null,
  titulo text not null,
  cuerpo text not null,             -- copia del modelo al momento de generarlo
  valores jsonb not null default '{}'::jsonb,
  lead_id uuid references leads(id) on delete set null
);

create index if not exists documentos_generados_fecha_idx on documentos_generados (creado_en desc);

alter table modelos_documento enable row level security;
alter table documentos_generados enable row level security;

drop policy if exists "Staff lee modelos" on modelos_documento;
create policy "Staff lee modelos" on modelos_documento for select using (mi_rol() is not null);
drop policy if exists "Staff gestiona modelos" on modelos_documento;
create policy "Staff gestiona modelos" on modelos_documento for all using (mi_rol() in ('administrador', 'supervisor', 'vendedor'));

drop policy if exists "Staff lee documentos" on documentos_generados;
create policy "Staff lee documentos" on documentos_generados for select using (mi_rol() is not null);
drop policy if exists "Staff gestiona documentos" on documentos_generados;
create policy "Staff gestiona documentos" on documentos_generados for all using (mi_rol() in ('administrador', 'supervisor', 'vendedor'));
