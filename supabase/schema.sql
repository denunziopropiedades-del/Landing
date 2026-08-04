-- ═══════════════════════════════════════════════════════════════════════
-- Plataforma inmobiliaria — esquema v2 (multi-proyecto + CRM + roles)
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query).
-- Este script es idempotente: puede correrse de nuevo en un proyecto vacío
-- durante el desarrollo sin dejar objetos huérfanos.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Limpieza (desarrollo): borra el esquema anterior si existía
-- ─────────────────────────────────────────────────────────────────────────
drop table if exists actividad_log cascade;
drop table if exists visitas cascade;
drop table if exists leads cascade;
drop table if exists novedades cascade;
drop table if exists progreso_desarrollo cascade;
drop table if exists faqs cascade;
drop table if exists testimonios cascade;
drop table if exists galeria cascade;
drop table if exists site_textos cascade;
drop table if exists financiacion_config cascade;
drop table if exists promociones cascade;
drop table if exists promocion cascade;
drop table if exists banners cascade;
drop table if exists lotes cascade;
drop table if exists proyectos cascade;
drop table if exists perfiles cascade;
drop function if exists mi_rol();
drop function if exists handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════
-- Perfiles y roles
-- ═══════════════════════════════════════════════════════════════════════

create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text,
  rol text not null default 'vendedor' check (rol in ('administrador', 'vendedor', 'supervisor')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Función auxiliar (security definer) para leer el rol del usuario actual
-- sin disparar recursión de RLS sobre la propia tabla perfiles.
create or replace function mi_rol()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select rol from perfiles where id = auth.uid() and activo = true;
$$;

-- Crea automáticamente un perfil (rol "vendedor" por defecto) al registrar
-- un usuario en Supabase Auth. El primer administrador se promueve a mano:
-- update perfiles set rol = 'administrador' where email = 'tu@email.com';
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfiles (id, email, nombre, rol)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), 'vendedor');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════
-- Proyectos (desarrollos inmobiliarios)
-- ═══════════════════════════════════════════════════════════════════════

create table proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text unique not null,
  descripcion text not null default '',
  ubicacion text not null default '',
  imagen_portada text,
  publicado boolean not null default false,
  destacado boolean not null default false,
  whatsapp_numero text,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- Lotes (inventario real, individual, por manzana y número)
-- ═══════════════════════════════════════════════════════════════════════

create table lotes (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  nombre text not null,
  manzana text not null,
  numero text not null,
  superficie_m2 numeric not null,
  dimensiones text not null,
  precio_usd numeric not null,
  estado text not null default 'disponible' check (estado in ('disponible', 'reservado', 'vendido', 'no_disponible')),
  destacado boolean not null default false,
  pos_x numeric check (pos_x is null or (pos_x >= 0 and pos_x <= 100)),
  pos_y numeric check (pos_y is null or (pos_y >= 0 and pos_y <= 100)),
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  unique (proyecto_id, manzana, numero)
);

create index lotes_proyecto_idx on lotes (proyecto_id);
create index lotes_estado_idx on lotes (estado);

-- ═══════════════════════════════════════════════════════════════════════
-- Banners (portada / promocionales, globales o de un proyecto)
-- ═══════════════════════════════════════════════════════════════════════

create table banners (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  titulo text not null,
  imagen_url text not null,
  link_url text,
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- Promociones (contador regresivo, historial por proyecto)
-- ═══════════════════════════════════════════════════════════════════════

create table promociones (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  activa boolean not null default true,
  titulo text not null,
  bajada text not null default '',
  fecha_fin timestamptz not null,
  creado_en timestamptz not null default now()
);

create index promociones_proyecto_idx on promociones (proyecto_id);

-- ═══════════════════════════════════════════════════════════════════════
-- Configuración de financiación (una por proyecto)
-- ═══════════════════════════════════════════════════════════════════════

create table financiacion_config (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null unique references proyectos(id) on delete cascade,
  anticipo_minimo_pct numeric not null default 20,
  anticipo_maximo_pct numeric not null default 50,
  cuotas_opciones integer[] not null default '{12,24,36,48,60}',
  interes_anual_pct numeric not null default 6
);

-- ═══════════════════════════════════════════════════════════════════════
-- Textos y datos generales de la plataforma (singleton)
-- ═══════════════════════════════════════════════════════════════════════

create table site_textos (
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

-- ═══════════════════════════════════════════════════════════════════════
-- Galería (por proyecto)
-- ═══════════════════════════════════════════════════════════════════════

create table galeria (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  categoria text not null check (categoria in ('fotos', 'videos', 'drone', 'plano', 'masterplan')),
  url text not null,
  titulo text not null default '',
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

create index galeria_proyecto_idx on galeria (proyecto_id);

-- ═══════════════════════════════════════════════════════════════════════
-- Testimonios (globales o de un proyecto puntual)
-- ═══════════════════════════════════════════════════════════════════════

create table testimonios (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  nombre text not null,
  ubicacion text,
  foto text,
  comentario text not null,
  estrellas integer not null default 5 check (estrellas between 1 and 5),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- Preguntas frecuentes (globales o de un proyecto puntual)
-- ═══════════════════════════════════════════════════════════════════════

create table faqs (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  pregunta text not null,
  respuesta text not null,
  orden integer not null default 0
);

-- ═══════════════════════════════════════════════════════════════════════
-- Novedades / noticias (globales o de un proyecto puntual)
-- ═══════════════════════════════════════════════════════════════════════

create table novedades (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id) on delete cascade,
  titulo text not null,
  contenido text not null,
  publicado boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- Estado del desarrollo / avance de obra (por proyecto)
-- ═══════════════════════════════════════════════════════════════════════

create table progreso_desarrollo (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  etapa text not null,
  porcentaje numeric not null check (porcentaje between 0 and 100),
  orden integer not null default 0
);

-- ═══════════════════════════════════════════════════════════════════════
-- Leads (CRM) — pipeline: nuevo → contactado → visita_programada →
-- reservado → vendido, con "descartado" como salida en cualquier punto.
-- ═══════════════════════════════════════════════════════════════════════

create table leads (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  tipo text not null check (tipo in ('reserva', 'contacto')),
  proyecto_id uuid references proyectos(id) on delete set null,
  lote_id uuid references lotes(id) on delete set null,
  nombre text not null,
  apellido text,
  dni text,
  email text not null,
  telefono text not null,
  mensaje text,
  manzana text,
  observaciones text not null default '',
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'visita_programada', 'reservado', 'vendido', 'descartado')),
  asignado_a uuid references perfiles(id) on delete set null
);

create index leads_estado_idx on leads (estado);
create index leads_proyecto_idx on leads (proyecto_id);
create index leads_asignado_idx on leads (asignado_a);

-- ═══════════════════════════════════════════════════════════════════════
-- Visitas agendadas
-- ═══════════════════════════════════════════════════════════════════════

create table visitas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  lead_id uuid references leads(id) on delete set null,
  proyecto_id uuid references proyectos(id) on delete set null,
  nombre text not null,
  email text not null,
  telefono text not null,
  fecha date not null,
  horario text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'cancelada', 'realizada')),
  google_event_id text
);

-- ═══════════════════════════════════════════════════════════════════════
-- Registro de actividad (auditoría de acciones administrativas)
-- ═══════════════════════════════════════════════════════════════════════

create table actividad_log (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  usuario_id uuid references perfiles(id) on delete set null,
  usuario_email text,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb
);

create index actividad_log_creado_idx on actividad_log (creado_en desc);

-- ═══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════

alter table perfiles enable row level security;
alter table proyectos enable row level security;
alter table lotes enable row level security;
alter table banners enable row level security;
alter table promociones enable row level security;
alter table financiacion_config enable row level security;
alter table site_textos enable row level security;
alter table galeria enable row level security;
alter table testimonios enable row level security;
alter table faqs enable row level security;
alter table novedades enable row level security;
alter table progreso_desarrollo enable row level security;
alter table leads enable row level security;
alter table visitas enable row level security;
alter table actividad_log enable row level security;

-- Perfiles: cada usuario lee su propio perfil; administrador y supervisor
-- pueden leer todos; solo administrador escribe (alta/edición/borrado).
create policy "Ver perfil propio" on perfiles for select using (id = auth.uid());
create policy "Staff lee todos los perfiles" on perfiles for select using (mi_rol() in ('administrador', 'supervisor'));
create policy "Admin gestiona perfiles" on perfiles for all using (mi_rol() = 'administrador');

-- Proyectos: lectura pública de los publicados; staff lee todos;
-- administrador y supervisor escriben.
create policy "Lectura pública de proyectos publicados" on proyectos for select using (publicado = true);
create policy "Staff lee todos los proyectos" on proyectos for select using (mi_rol() is not null);
create policy "Admin/supervisor gestionan proyectos" on proyectos for all using (mi_rol() in ('administrador', 'supervisor'));

-- Lotes: lectura pública si el proyecto está publicado; staff lee todos;
-- administrador y supervisor escriben (los vendedores no editan inventario
-- directamente, pero el sistema sincroniza el estado del lote cuando un
-- lead avanza a "Reservado"/"Vendido" en el CRM).
create policy "Lectura pública de lotes de proyectos publicados" on lotes for select
  using (exists (select 1 from proyectos p where p.id = lotes.proyecto_id and p.publicado = true));
create policy "Staff lee todos los lotes" on lotes for select using (mi_rol() is not null);
create policy "Admin/supervisor gestionan lotes" on lotes for all using (mi_rol() in ('administrador', 'supervisor'));

-- Banners
create policy "Lectura pública de banners activos" on banners for select using (activo = true);
create policy "Staff lee todos los banners" on banners for select using (mi_rol() is not null);
create policy "Admin/supervisor gestionan banners" on banners for all using (mi_rol() in ('administrador', 'supervisor'));

-- Promociones
create policy "Lectura pública de promociones" on promociones for select using (true);
create policy "Admin/supervisor gestionan promociones" on promociones for all using (mi_rol() in ('administrador', 'supervisor'));

-- Financiación
create policy "Lectura pública de financiación" on financiacion_config for select using (true);
create policy "Admin/supervisor gestionan financiación" on financiacion_config for all using (mi_rol() in ('administrador', 'supervisor'));

-- Textos del sitio
create policy "Lectura pública de textos" on site_textos for select using (true);
create policy "Admin/supervisor gestionan textos" on site_textos for all using (mi_rol() in ('administrador', 'supervisor'));

-- Galería
create policy "Lectura pública de galería de proyectos publicados" on galeria for select
  using (exists (select 1 from proyectos p where p.id = galeria.proyecto_id and p.publicado = true));
create policy "Staff lee toda la galería" on galeria for select using (mi_rol() is not null);
create policy "Admin/supervisor gestionan galería" on galeria for all using (mi_rol() in ('administrador', 'supervisor'));

-- Testimonios
create policy "Lectura pública de testimonios" on testimonios for select using (true);
create policy "Admin/supervisor gestionan testimonios" on testimonios for all using (mi_rol() in ('administrador', 'supervisor'));

-- FAQs
create policy "Lectura pública de faqs" on faqs for select using (true);
create policy "Admin/supervisor gestionan faqs" on faqs for all using (mi_rol() in ('administrador', 'supervisor'));

-- Novedades
create policy "Lectura pública de novedades publicadas" on novedades for select using (publicado = true);
create policy "Staff lee todas las novedades" on novedades for select using (mi_rol() is not null);
create policy "Admin/supervisor gestionan novedades" on novedades for all using (mi_rol() in ('administrador', 'supervisor'));

-- Progreso de desarrollo
create policy "Lectura pública de progreso" on progreso_desarrollo for select
  using (exists (select 1 from proyectos p where p.id = progreso_desarrollo.proyecto_id and p.publicado = true));
create policy "Staff lee todo el progreso" on progreso_desarrollo for select using (mi_rol() is not null);
create policy "Admin/supervisor gestionan progreso" on progreso_desarrollo for all using (mi_rol() in ('administrador', 'supervisor'));

-- Leads: alta pública (formularios), lectura/edición según rol.
create policy "Alta pública de leads" on leads for insert with check (true);
create policy "Admin/supervisor leen todos los leads" on leads for select using (mi_rol() in ('administrador', 'supervisor'));
create policy "Vendedor lee sus leads y los sin asignar" on leads for select
  using (mi_rol() = 'vendedor' and (asignado_a = auth.uid() or asignado_a is null));
create policy "Admin/supervisor editan todos los leads" on leads for update using (mi_rol() in ('administrador', 'supervisor'));
create policy "Vendedor edita sus leads y los sin asignar" on leads for update
  using (mi_rol() = 'vendedor' and (asignado_a = auth.uid() or asignado_a is null));
create policy "Admin borra leads" on leads for delete using (mi_rol() = 'administrador');

-- Visitas: alta pública, cualquier miembro del staff puede ver/gestionar.
create policy "Alta pública de visitas" on visitas for insert with check (true);
create policy "Staff gestiona visitas" on visitas for all using (mi_rol() is not null);

-- Registro de actividad: solo lectura para administrador/supervisor; las
-- escrituras se hacen desde el servidor con la service role key.
create policy "Admin/supervisor leen actividad" on actividad_log for select using (mi_rol() in ('administrador', 'supervisor'));

-- ═══════════════════════════════════════════════════════════════════════
-- Datos semilla: proyecto insignia "Ayres de Guernica"
-- ═══════════════════════════════════════════════════════════════════════

insert into site_textos (id, hero_titulo, hero_subtitulo, whatsapp_numero, whatsapp_mensaje_default, email, instagram, facebook, youtube)
values (
  1,
  'Encontrá el lote ideal para tu inversión',
  'Desarrollos inmobiliarios con escritura garantizada en las zonas de mayor crecimiento del Gran Buenos Aires.',
  '5491127424512',
  'Hola, me interesa recibir información.',
  'denunziopropiedades@gmail.com',
  'https://instagram.com/matulotes',
  'https://facebook.com/matulotes',
  'https://youtube.com/@matulotes'
);

with proyecto_seed as (
  insert into proyectos (nombre, slug, descripcion, ubicacion, publicado, destacado, whatsapp_numero, orden)
  values (
    'Ayres de Guernica',
    'ayres-de-guernica',
    'Lotes con escritura garantizada en una de las zonas con mayor crecimiento del sur del Gran Buenos Aires.',
    'Guernica, Buenos Aires',
    true,
    true,
    '5491127424512',
    0
  )
  returning id
)
insert into lotes (proyecto_id, nombre, manzana, numero, superficie_m2, dimensiones, precio_usd, estado, destacado, pos_x, pos_y, orden)
select id, v.nombre, v.manzana, v.numero, v.superficie_m2, v.dimensiones, v.precio_usd, v.estado, v.destacado, v.pos_x, v.pos_y, v.orden
from proyecto_seed,
  (values
    ('Lote 300 m²', 'A', '1', 300, '10 x 30', 2700, 'disponible', false, 12, 20, 1),
    ('Lote 300 m²', 'A', '2', 300, '10 x 30', 2700, 'disponible', false, 22, 20, 2),
    ('Lote 300 m²', 'A', '3', 300, '10 x 30', 2700, 'reservado', false, 32, 20, 3),
    ('Lote 600 m²', 'B', '1', 600, '20 x 30', 5400, 'disponible', true, 12, 45, 4),
    ('Lote 600 m²', 'B', '2', 600, '20 x 30', 5400, 'vendido', true, 27, 45, 5),
    ('Lote 900 m²', 'C', '1', 900, '30 x 30', 8100, 'disponible', false, 15, 70, 6),
    ('Lote 900 m²', 'C', '2', 900, '30 x 30', 8100, 'no_disponible', false, 35, 70, 7)
  ) as v(nombre, manzana, numero, superficie_m2, dimensiones, precio_usd, estado, destacado, pos_x, pos_y, orden);

insert into financiacion_config (proyecto_id, anticipo_minimo_pct, anticipo_maximo_pct, cuotas_opciones, interes_anual_pct)
select id, 20, 50, '{12,24,36,48,60}', 6 from proyectos where slug = 'ayres-de-guernica';

insert into promociones (proyecto_id, activa, titulo, bajada, fecha_fin)
select id, true, '¡Últimos días con estos precios!', 'Promoción especial por tiempo limitado.', '2026-08-31 23:59:59-03'
from proyectos where slug = 'ayres-de-guernica';

insert into progreso_desarrollo (proyecto_id, etapa, porcentaje, orden)
select id, v.etapa, v.porcentaje, v.orden
from proyectos, (values
  ('Calles', 90, 1),
  ('Alumbrado', 70, 2),
  ('Cerco perimetral', 100, 3),
  ('Portal de ingreso', 60, 4),
  ('Obras', 75, 5),
  ('Lotes entregados', 40, 6)
) as v(etapa, porcentaje, orden)
where proyectos.slug = 'ayres-de-guernica';

insert into faqs (proyecto_id, pregunta, respuesta, orden)
values
  (null, '¿Tiene escritura?', 'Sí, todos nuestros lotes se entregan con escritura garantizada, brindando plena seguridad jurídica a la inversión.', 1),
  (null, '¿Cómo es la financiación?', 'Ofrecemos planes de financiación propia con anticipo y cuotas fijas. Usá la calculadora de cada proyecto para simular tu plan.', 2),
  (null, '¿Puedo visitar el proyecto?', 'Sí, coordinamos visitas guiadas todos los días. Podés agendar tu visita desde la web o directamente por WhatsApp.', 3),
  (null, '¿Cómo se reserva un lote?', 'Podés reservar online seleccionando manzana y lote, o coordinar con nuestro equipo comercial vía WhatsApp.', 4);

insert into testimonios (proyecto_id, nombre, ubicacion, foto, comentario, estrellas, orden)
values
  (null, 'Marcela Ibáñez', 'Guernica, Buenos Aires', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop', 'Compramos nuestro lote hace un año y la atención fue excelente desde el primer momento. Todo con la documentación en regla.', 5, 1),
  (null, 'Julián Torres', 'San Vicente, Buenos Aires', 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300&auto=format&fit=crop', 'Invertimos pensando en el futuro y la valorización de la zona ya se está notando. Muy conformes con el desarrollo.', 5, 2),
  (null, 'Carla Domínguez', 'Canning, Buenos Aires', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop', 'La financiación se adaptó perfectamente a lo que necesitábamos. Recomiendo la empresa sin dudarlo.', 5, 3);

insert into galeria (proyecto_id, categoria, url, titulo, orden)
select id, v.categoria, v.url, v.titulo, v.orden
from proyectos, (values
  ('fotos', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop', 'Vista del barrio', 1),
  ('fotos', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop', 'Entorno natural', 2),
  ('drone', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop', 'Toma aérea general', 3),
  ('drone', 'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?q=80&w=1600&auto=format&fit=crop', 'Toma aérea del acceso', 4),
  ('plano', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop', 'Plano del barrio', 5),
  ('masterplan', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop', 'Masterplan', 6)
) as v(categoria, url, titulo, orden)
where proyectos.slug = 'ayres-de-guernica';
