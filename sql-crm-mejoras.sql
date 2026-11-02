-- Mejoras del CRM (noviembre 2026)
--
-- 1) Contactos unificados: cada lead guarda su teléfono normalizado (10 dígitos, sin +54 9, 0 ni 15)
--    para que una consulta nueva de la misma persona se sume a su ficha en vez de crear otra.
-- 2) Origen: de dónde vino cada lead (Meta, Google, Instagram, preventa, etc.) y la campaña (utm).
-- 3) Perfil de búsqueda: qué busca cada cliente, para cruzarlo con los lotes disponibles.
--
-- Correr una sola vez en Supabase > SQL Editor. Se puede volver a correr sin romper nada.

create or replace function normalizar_telefono(t text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := regexp_replace(coalesce(t, ''), '\D', '', 'g');
  if d like '54%' then d := substr(d, 3); end if;
  if d like '9%' then d := substr(d, 2); end if;
  if d like '0%' then d := substr(d, 2); end if;
  if length(d) = 12 and substr(d, 3, 2) = '15' then d := substr(d, 1, 2) || substr(d, 5); end if;
  if length(d) > 10 then d := right(d, 10); end if;
  return nullif(d, '');
end $$;

alter table leads add column if not exists telefono_norm text;
alter table leads add column if not exists origen text;
alter table leads add column if not exists utm_source text;
alter table leads add column if not exists utm_medium text;
alter table leads add column if not exists utm_campaign text;
alter table leads add column if not exists busqueda_presupuesto_usd numeric;
alter table leads add column if not exists busqueda_zona text;
alter table leads add column if not exists busqueda_pago text;
alter table leads add column if not exists busqueda_anticipo text;
alter table leads add column if not exists busqueda_notas text;
alter table leads add column if not exists consultas_unificadas integer not null default 0;

create or replace function leads_set_telefono_norm() returns trigger
language plpgsql as $$
begin
  new.telefono_norm := normalizar_telefono(new.telefono);
  return new;
end $$;

drop trigger if exists leads_telefono_norm on leads;
create trigger leads_telefono_norm before insert or update of telefono on leads
  for each row execute function leads_set_telefono_norm();

update leads set telefono_norm = normalizar_telefono(telefono) where telefono_norm is distinct from normalizar_telefono(telefono);

create index if not exists leads_telefono_norm_idx on leads (telefono_norm);

-- Origen de los leads que ya existían (lo que se puede deducir con seguridad).
update leads set origen = 'meta_lead_ads' where origen is null and tipo = 'meta';

-- Unificar las fichas repetidas que ya existían: SOLO consultas (ninguna con venta, reserva, lote, DNI ni cuotas).
-- Queda la ficha más avanzada (o la más nueva) con las observaciones de las demás; las visitas pasan a esa ficha.
do $$
declare
  g record;
  queda uuid;
  otras uuid[];
  textos text;
begin
  for g in
    select l.telefono_norm
    from leads l
    where l.telefono_norm is not null and length(l.telefono_norm) >= 8
    group by l.telefono_norm
    having count(*) > 1
       and bool_and(l.estado in ('nuevo', 'contactado', 'visita_programada', 'visita_realizada', 'descartado'))
       and bool_and(l.lote_id is null and l.dni is null)
       and not exists (select 1 from cuotas c join leads x on x.id = c.lead_id where x.telefono_norm = l.telefono_norm)
       and not exists (select 1 from lead_lotes ll join leads x on x.id = ll.lead_id where x.telefono_norm = l.telefono_norm)
  loop
    select id into queda from leads
    where telefono_norm = g.telefono_norm
    order by array_position(array['descartado', 'nuevo', 'contactado', 'visita_programada', 'visita_realizada'], estado) desc, creado_en desc
    limit 1;

    select array_agg(id), string_agg(
      '🔁 Consulta anterior (' || to_char(creado_en at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') || ', ' || tipo || ', ' || estado || '):' || chr(10) || coalesce(observaciones, ''),
      chr(10) || chr(10) order by creado_en)
    into otras, textos
    from leads where telefono_norm = g.telefono_norm and id <> queda;

    update leads set
      observaciones = concat_ws(chr(10) || chr(10), observaciones, textos),
      consultas_unificadas = consultas_unificadas + coalesce(array_length(otras, 1), 0),
      asignado_a = coalesce(asignado_a, (select asignado_a from leads where id = any(otras) and asignado_a is not null limit 1)),
      actualizado_en = now()
    where id = queda;

    update visitas set lead_id = queda where lead_id = any(otras);
    update documentos_generados set lead_id = queda where lead_id = any(otras);
    delete from leads where id = any(otras);
  end loop;
end $$;
