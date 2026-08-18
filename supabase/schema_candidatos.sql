-- ═══════════════════════════════════════════════════════════════════════
-- Sistema de selección de personal (albañilería/construcción) — esquema
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query).
-- Es un módulo totalmente independiente del esquema inmobiliario
-- (schema.sql): tablas, roles y RLS propios, sin relación con "lotes",
-- "proyectos", "leads", etc. Podés correrlo en el mismo proyecto de
-- Supabase o en uno nuevo (con NEXT_PUBLIC_SUPABASE_URL apuntando a ese otro).
-- Este script es idempotente: puede correrse de nuevo sin dejar objetos huérfanos.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

drop table if exists candidatos_configuracion cascade;
drop table if exists candidatos cascade;
drop table if exists candidatos_administradores cascade;
drop function if exists es_admin_candidatos();

-- ═══════════════════════════════════════════════════════════════════════
-- Administradores del módulo
-- ═══════════════════════════════════════════════════════════════════════

create table candidatos_administradores (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Función auxiliar (security definer) para saber si el usuario actual es
-- administrador de este módulo, sin disparar recursión de RLS.
create or replace function es_admin_candidatos()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from candidatos_administradores where id = auth.uid() and activo = true
  );
$$;

-- No hay alta automática: hay que crear el usuario en Authentication > Users
-- y después habilitarlo acá a mano, por ejemplo:
-- insert into candidatos_administradores (id, email, nombre)
-- select id, email, 'Tu nombre' from auth.users where email = 'tu@email.com';

-- ═══════════════════════════════════════════════════════════════════════
-- Candidatos
-- ═══════════════════════════════════════════════════════════════════════

create table candidatos (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  nombre_apellido text not null,
  dni text not null,
  telefono text not null,
  localidad text,
  edad integer,

  cargo text not null default 'ayudante'
    check (cargo in ('ayudante', 'medio_oficial', 'oficial', 'oficial_especializado')),
  anos_experiencia numeric(5, 1) not null default 0,
  especialidad text,
  trabajos_que_sabe text,
  experiencia_comprobable boolean not null default false,
  referencias_laborales text,

  disponibilidad_inicio text
    check (disponibilidad_inicio in ('inmediata', 'una_semana', 'quince_dias', 'a_convenir')),
  disponibilidad_horaria text,

  pretension_salarial_diaria numeric(12, 2),
  ultima_remuneracion_diaria numeric(12, 2),
  acepta_jornada boolean not null default false,
  acepta_obra boolean not null default false,
  herramientas_propias boolean not null default false,
  movilidad_propia boolean not null default false,

  observaciones text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'preseleccionado', 'entrevista', 'aprobado', 'contratado', 'descartado')),
  origen text not null default 'manual' check (origen in ('publica', 'manual', 'importado')),

  puntaje integer not null default 0,
  clasificacion text
);

create index candidatos_dni_idx on candidatos (dni);
create index candidatos_telefono_idx on candidatos (telefono);
create index candidatos_estado_idx on candidatos (estado);
create index candidatos_cargo_idx on candidatos (cargo);
create index candidatos_localidad_idx on candidatos (localidad);
create index candidatos_pretension_idx on candidatos (pretension_salarial_diaria);
create index candidatos_puntaje_idx on candidatos (puntaje);

-- ═══════════════════════════════════════════════════════════════════════
-- Configuración (puntaje y mensaje de WhatsApp) — fila única (id = 1)
-- ═══════════════════════════════════════════════════════════════════════

create table candidatos_configuracion (
  id integer primary key default 1,
  pesos jsonb not null default '{
    "experiencia": 20,
    "cargo": 20,
    "especialidad": 10,
    "disponibilidad": 15,
    "pretensionSalarial": 15,
    "referencias": 10,
    "herramientas": 5,
    "movilidad": 5
  }'::jsonb,
  salario_referencia numeric(12, 2) not null default 55000,
  mensaje_whatsapp text not null default
    'Hola {{nombre}}, somos del equipo de selección. Vimos tu postulación para el puesto de {{cargo}}. ¿Nos confirmás si actualmente estás disponible para trabajar?',
  actualizado_en timestamptz not null default now(),
  constraint candidatos_configuracion_singleton check (id = 1)
);

insert into candidatos_configuracion (id) values (1);

-- ═══════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════

alter table candidatos_administradores enable row level security;
alter table candidatos enable row level security;
alter table candidatos_configuracion enable row level security;

create policy "Un admin ve su propio registro" on candidatos_administradores
  for select using (id = auth.uid());

create policy "Admins leen candidatos" on candidatos
  for select using (es_admin_candidatos());
create policy "Admins escriben candidatos" on candidatos
  for all using (es_admin_candidatos()) with check (es_admin_candidatos());

create policy "Admins leen configuracion" on candidatos_configuracion
  for select using (es_admin_candidatos());
create policy "Admins editan configuracion" on candidatos_configuracion
  for update using (es_admin_candidatos());

-- Nota: el formulario público de postulación (/postularme) inserta candidatos
-- usando la service role key desde el servidor (bypassa RLS de forma
-- controlada, con validación y rate limiting), no una policy de "insert" anónima.
