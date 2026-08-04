-- Ayres de Guernica — esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Proyectos (permite administrar más de un desarrollo inmobiliario)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text unique not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Lotes / tipologías disponibles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists lotes (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  nombre text not null,
  superficie_m2 numeric not null,
  dimensiones text not null,
  precio_usd numeric not null,
  disponibles integer not null default 0,
  destacado boolean not null default false,
  orden integer not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- Promoción / contador regresivo ("últimos días")
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists promocion (
  id integer primary key default 1,
  activa boolean not null default true,
  titulo text not null default '¡Últimos días con estos precios!',
  bajada text not null default 'Promoción especial por tiempo limitado.',
  fecha_fin timestamptz not null default (now() + interval '30 days'),
  constraint promocion_singleton check (id = 1)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Configuración de financiación
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists financiacion_config (
  id integer primary key default 1,
  anticipo_minimo_pct numeric not null default 20,
  anticipo_maximo_pct numeric not null default 50,
  cuotas_opciones integer[] not null default '{12,24,36,48,60}',
  interes_anual_pct numeric not null default 6,
  constraint financiacion_config_singleton check (id = 1)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Textos y datos generales del sitio
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists site_textos (
  id integer primary key default 1,
  hero_titulo text not null,
  hero_subtitulo text not null,
  whatsapp_numero text not null,
  whatsapp_mensaje_default text not null,
  email text not null,
  instagram text,
  facebook text,
  youtube text,
  constraint site_textos_singleton check (id = 1)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Galería (fotos, videos, drone, plano, masterplan)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists galeria (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('fotos', 'videos', 'drone', 'plano', 'masterplan')),
  url text not null,
  titulo text not null default '',
  creado_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Testimonios
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists testimonios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ubicacion text,
  foto text,
  comentario text not null,
  estrellas integer not null default 5 check (estrellas between 1 and 5),
  creado_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Novedades / noticias
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists novedades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text not null,
  publicado boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Leads (reservas y consultas de contacto)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  tipo text not null check (tipo in ('reserva', 'contacto')),
  nombre text not null,
  apellido text,
  dni text,
  email text not null,
  telefono text not null,
  mensaje text,
  manzana text,
  lote text,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'reservado', 'descartado'))
);

-- ─────────────────────────────────────────────────────────────────────────
-- Visitas agendadas
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists visitas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  nombre text not null,
  email text not null,
  telefono text not null,
  fecha date not null,
  horario text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'cancelada'))
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────
alter table proyectos enable row level security;
alter table lotes enable row level security;
alter table promocion enable row level security;
alter table financiacion_config enable row level security;
alter table site_textos enable row level security;
alter table galeria enable row level security;
alter table testimonios enable row level security;
alter table novedades enable row level security;
alter table leads enable row level security;
alter table visitas enable row level security;

-- Lectura pública para el contenido de la web
create policy "Lectura pública" on proyectos for select using (true);
create policy "Lectura pública" on lotes for select using (true);
create policy "Lectura pública" on promocion for select using (true);
create policy "Lectura pública" on financiacion_config for select using (true);
create policy "Lectura pública" on site_textos for select using (true);
create policy "Lectura pública" on galeria for select using (true);
create policy "Lectura pública" on testimonios for select using (true);
create policy "Lectura pública de novedades publicadas" on novedades for select using (publicado = true);

-- Escritura solo para usuarios autenticados (panel admin)
create policy "Escritura admin" on proyectos for all using (auth.role() = 'authenticated');
create policy "Escritura admin" on lotes for all using (auth.role() = 'authenticated');
create policy "Escritura admin" on promocion for all using (auth.role() = 'authenticated');
create policy "Escritura admin" on financiacion_config for all using (auth.role() = 'authenticated');
create policy "Escritura admin" on site_textos for all using (auth.role() = 'authenticated');
create policy "Escritura admin" on galeria for all using (auth.role() = 'authenticated');
create policy "Escritura admin" on testimonios for all using (auth.role() = 'authenticated');
create policy "Escritura admin" on novedades for all using (auth.role() = 'authenticated');

-- Leads y visitas: cualquiera puede crear (formularios públicos), solo admin lee/edita
create policy "Alta pública de leads" on leads for insert with check (true);
create policy "Gestión admin de leads" on leads for select using (auth.role() = 'authenticated');
create policy "Edición admin de leads" on leads for update using (auth.role() = 'authenticated');
create policy "Borrado admin de leads" on leads for delete using (auth.role() = 'authenticated');

create policy "Alta pública de visitas" on visitas for insert with check (true);
create policy "Gestión admin de visitas" on visitas for select using (auth.role() = 'authenticated');
create policy "Edición admin de visitas" on visitas for update using (auth.role() = 'authenticated');
create policy "Borrado admin de visitas" on visitas for delete using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────
-- Datos semilla (coinciden con lib/data.ts, opcional)
-- ─────────────────────────────────────────────────────────────────────────
insert into promocion (id, activa, titulo, bajada, fecha_fin)
values (1, true, '¡Últimos días con estos precios!', 'Promoción especial por tiempo limitado.', '2026-08-31 23:59:59-03')
on conflict (id) do nothing;

insert into financiacion_config (id, anticipo_minimo_pct, anticipo_maximo_pct, cuotas_opciones, interes_anual_pct)
values (1, 20, 50, '{12,24,36,48,60}', 6)
on conflict (id) do nothing;

insert into site_textos (id, hero_titulo, hero_subtitulo, whatsapp_numero, whatsapp_mensaje_default, email, instagram, facebook, youtube)
values (
  1,
  'Invertí hoy en tu lote en Ayres de Guernica',
  'Lotes con escritura garantizada en una de las zonas con mayor crecimiento del sur del Gran Buenos Aires.',
  '5491100000000',
  'Hola Matías. Me interesa recibir información sobre Ayres de Guernica.',
  'info@ayresdeguernica.com.ar',
  'https://instagram.com/ayresdeguernica',
  'https://facebook.com/ayresdeguernica',
  'https://youtube.com/@ayresdeguernica'
)
on conflict (id) do nothing;

insert into proyectos (nombre, slug, activo) values ('Ayres de Guernica – Etapa 2', 'ayres-de-guernica-etapa-2', true)
on conflict (slug) do nothing;
