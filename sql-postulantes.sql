-- Recursos humanos: postulaciones que llegan desde /postulantes ("Trabajá con nosotros").
--
-- postulantes: cada persona que se postula, con el puesto que le interesa,
--   su zona, experiencia y el CV adjunto (si lo subió).
-- Bucket "cvs" (privado): guarda los CV en PDF/Word. Nadie los ve sin pasar
--   por el panel admin, que genera un link temporal de descarga.
--
-- Correr una sola vez en Supabase > SQL Editor.

create table if not exists postulantes (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  nombre text not null,
  email text not null,
  telefono text not null,
  localidad text,
  puesto text not null,
  experiencia text,
  disponibilidad text,
  movilidad boolean,
  linkedin text,
  mensaje text,
  cv_path text,
  cv_nombre text,
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'entrevista', 'incorporado', 'descartado')),
  notas text
);

create index if not exists postulantes_creado_en_idx on postulantes (creado_en desc);

-- Solo el servidor (service role) lee y escribe esta tabla.
alter table postulantes enable row level security;

-- Bucket privado para los CV (máx. 5 MB por archivo).
insert into storage.buckets (id, name, public, file_size_limit)
values ('cvs', 'cvs', false, 5242880)
on conflict (id) do nothing;
