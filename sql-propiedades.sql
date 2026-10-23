-- Propiedades: casas, departamentos, locales, terrenos y CAMPOS en venta o alquiler,
-- organizadas por partido (zonas del Departamento Judicial La Plata, ver lib/zonas.ts).
--
-- Corré esto en Supabase → SQL Editor. Es seguro correrlo más de una vez.

create table if not exists propiedades (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  slug text not null unique,
  titulo text not null,
  descripcion text not null default '',

  operacion text not null check (operacion in ('venta', 'alquiler')),
  tipo text not null check (tipo in ('casa', 'departamento', 'ph', 'local', 'galpon', 'terreno', 'lote_comercial', 'campo', 'chacra')),

  -- Ubicación: partido = slug de lib/zonas.ts (ej. 'presidente-peron').
  partido text not null,
  localidad text,
  direccion text,
  maps_url text,

  -- Precio. unidad: total | mes (alquiler) | ha (campo, por hectárea) | ha_anio (arrendamiento).
  precio numeric,
  moneda text not null default 'USD' check (moneda in ('USD', 'ARS')),
  precio_unidad text not null default 'total' check (precio_unidad in ('total', 'mes', 'ha', 'ha_anio')),
  expensas numeric,

  -- Casas / departamentos.
  ambientes int,
  dormitorios int,
  banos int,
  sup_cubierta numeric,
  sup_total numeric,
  apto_credito boolean not null default false,
  financiacion_directa boolean not null default false,
  situacion_dominial text check (situacion_dominial in ('escritura', 'posesion')),

  -- Campos / chacras.
  hectareas numeric,
  aptitud text,
  agua text,
  luz boolean,

  etiquetas text[] not null default '{}',
  fotos text[] not null default '{}',

  publicado boolean not null default false,
  destacado boolean not null default false,
  orden int not null default 0
);

create index if not exists propiedades_listado_idx on propiedades (publicado, operacion, tipo, partido);

alter table propiedades enable row level security;

drop policy if exists "Lectura pública de propiedades publicadas" on propiedades;
create policy "Lectura pública de propiedades publicadas" on propiedades
  for select using (publicado = true);

drop policy if exists "Staff lee todas las propiedades" on propiedades;
create policy "Staff lee todas las propiedades" on propiedades
  for select using (mi_rol() is not null);

drop policy if exists "Staff gestiona propiedades" on propiedades;
create policy "Staff gestiona propiedades" on propiedades
  for all using (mi_rol() in ('administrador', 'supervisor', 'vendedor'));

-- Consultas desde la ficha de una propiedad y pedidos de tasación quedan en leads.
alter table leads add column if not exists propiedad_id uuid references propiedades(id) on delete set null;

-- Columnas agregadas después (por si la tabla ya existía):
alter table propiedades add column if not exists financiacion_directa boolean not null default false;
alter table propiedades add column if not exists situacion_dominial text check (situacion_dominial in ('escritura', 'posesion'));

-- Nuevos tipos: naves industriales / galpones y lotes comerciales.
alter table propiedades drop constraint if exists propiedades_tipo_check;
alter table propiedades add constraint propiedades_tipo_check
  check (tipo in ('casa', 'departamento', 'ph', 'local', 'galpon', 'terreno', 'lote_comercial', 'campo', 'chacra'));

-- Barrio cerrado o abierto.
alter table propiedades add column if not exists tipo_barrio text check (tipo_barrio in ('cerrado', 'abierto'));

-- Venta en cuotas: anticipo y valor de contado.
alter table propiedades add column if not exists anticipo numeric;
alter table propiedades add column if not exists precio_contado numeric;
