-- Cartel "VENDIDO / ALQUILADO" en propiedades. Correr una sola vez en Supabase → SQL Editor.
alter table public.propiedades add column if not exists vendido boolean not null default false;
