-- Encuentra lotes asignados a más de un lead a la vez (la causa del error
-- "Ese lote ya está reservado/vendido/en escribanía con otro cliente").
-- Mostrá el resultado completo: te va a decir el barrio, manzana, lote y los
-- nombres de los clientes en conflicto.

select
  p.nombre as barrio,
  l.manzana,
  l.numero as lote,
  le.nombre,
  le.apellido,
  le.estado,
  le.email,
  le.telefono,
  le.actualizado_en
from leads le
join lotes l on l.id = le.lote_id
join proyectos p on p.id = l.proyecto_id
where le.lote_id in (
  select lote_id from leads
  where lote_id is not null
  group by lote_id
  having count(*) > 1
)
order by l.manzana, l.numero, le.actualizado_en;
