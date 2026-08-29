-- Lotes de MZ228 y MZ229 en Arroyos de San Vicente, con su plan de
-- financiación fijo propio: USD 900 de anticipo + 60 cuotas de USD 390.
-- Precio de contado: USD 12.900 (igual al resto de los lotes disponibles).
--
-- Esto se carga por SQL y no por el Excel de "Importar lotes" porque esa
-- plantilla no tiene columnas para el plan de financiación por lote; una vez
-- cargados así, se pueden editar igual que cualquier otro lote desde
-- Admin > Lotes y precios.

insert into lotes (
  proyecto_id, nombre, manzana, numero, superficie_m2, dimensiones, precio_usd, estado,
  anticipo_financiado_usd, cuotas_financiado, valor_cuota_financiado_usd
)
select
  (select id from proyectos where slug = 'arroyos-de-san-vicente'),
  'Lote ' || v.manzana || '-' || v.numero,
  v.manzana, v.numero, 600, '20 x 30', 12900, 'disponible',
  900, 60, 390
from (values
  ('228', '12'), ('228', '13'), ('228', '14'), ('228', '15'), ('228', '16'), ('228', '17'),
  ('228', '4'), ('228', '5'), ('228', '6'), ('228', '7'), ('228', '8'),
  ('229', '13'), ('229', '14'), ('229', '16'), ('229', '17'),
  ('229', '4'), ('229', '5'), ('229', '6'), ('229', '7'), ('229', '8'), ('229', '9')
) as v(manzana, numero)
on conflict (proyecto_id, manzana, numero) do update set
  precio_usd = excluded.precio_usd,
  estado = excluded.estado,
  anticipo_financiado_usd = excluded.anticipo_financiado_usd,
  cuotas_financiado = excluded.cuotas_financiado,
  valor_cuota_financiado_usd = excluded.valor_cuota_financiado_usd;
