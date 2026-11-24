-- Teléfonos siempre en formato +549 (noviembre 2026)
--
-- Si el cliente escribe el celular con 15 en vez de 11 (ej. 1569513078) o sin característica
-- (8 dígitos), se toma como AMBA: 15 → 11. Y se guarda siempre como +549 + característica + número
-- (ej. +5491169513078), en clientes (leads) y visitas, para que WhatsApp y Contactos lo reconozcan.
-- Se puede volver a correr sin romper nada.

create or replace function normalizar_telefono(t text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := regexp_replace(coalesce(t, ''), '\D', '', 'g');
  if d like '54%' then d := substr(d, 3); end if;
  if d like '9%' then d := substr(d, 2); end if;
  if d like '0%' then d := substr(d, 2); end if;
  if length(d) = 12 and substr(d, 3, 2) = '15' then d := substr(d, 1, 2) || substr(d, 5); end if;
  if length(d) = 10 and d like '15%' then d := '11' || substr(d, 3); end if;
  if length(d) = 8 then d := '11' || d; end if;
  if length(d) > 10 then d := right(d, 10); end if;
  return nullif(d, '');
end $$;

create or replace function formatear_telefono(t text) returns text
language plpgsql immutable as $$
declare d text;
begin
  d := normalizar_telefono(t);
  if d is not null and length(d) = 10 then return '+549' || d; end if;
  return t;
end $$;

create or replace function set_telefono_formateado() returns trigger
language plpgsql as $$
begin
  new.telefono := formatear_telefono(new.telefono);
  return new;
end $$;

-- Columna para saber qué teléfono se mandó a Google Contactos (y corregir los que quedaron mal).
alter table leads add column if not exists google_contacto_tel text;

drop trigger if exists leads_a_telefono_formato on leads;
create trigger leads_a_telefono_formato before insert or update of telefono on leads
  for each row execute function set_telefono_formateado();

drop trigger if exists visitas_telefono_formato on visitas;
create trigger visitas_telefono_formato before insert or update of telefono on visitas
  for each row execute function set_telefono_formateado();

-- Contactos de Google que ya estaban bien guardados (celular de 10 dígitos sin 15): no hace falta tocarlos.
update leads set google_contacto_tel =
  case when normalizar_telefono(telefono) like '11%'
       then '+54 9 11 ' || substr(normalizar_telefono(telefono), 3, 4) || '-' || substr(normalizar_telefono(telefono), 7)
       else '+54 9 ' || normalizar_telefono(telefono) end
where google_contacto_id is not null and google_contacto_tel is null
  and length(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(telefono,''), '\D', '', 'g'), '^54', ''), '^9', ''), '^0', '')) = 10
  and regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(telefono,''), '\D', '', 'g'), '^54', ''), '^9', ''), '^0', '') not like '15%';

-- Corrige los teléfonos ya cargados.
update leads set telefono = formatear_telefono(telefono) where telefono is distinct from formatear_telefono(telefono);
update leads set telefono_norm = normalizar_telefono(telefono) where telefono_norm is distinct from normalizar_telefono(telefono);
update visitas set telefono = formatear_telefono(telefono) where telefono is distinct from formatear_telefono(telefono);
update agenda_bloqueos set telefono_norm = normalizar_telefono(telefono_norm) where telefono_norm is distinct from normalizar_telefono(telefono_norm);
