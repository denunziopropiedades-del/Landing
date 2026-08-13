import { getActividadLog } from "@/lib/admin/data";

const ACCION_LABEL: Record<string, string> = {
  crear: "creó",
  actualizar: "actualizó",
  eliminar: "eliminó",
  publicar: "publicó",
  despublicar: "despublicó",
  "cambiar-estado": "cambió el estado de",
  "cambiar-rol": "cambió el rol de",
  "cambiar-proyecto": "cambió el desarrollo de",
  asignar: "asignó",
  anotar: "anotó en",
  activar: "activó",
  desactivar: "desactivó",
  invitar: "invitó a",
  importar: "importó",
  "eliminar-masivo": "eliminó en bloque",
  "actualizar-precio-masivo": "actualizó precios en bloque de",
};

function formatearDetalle(detalle: Record<string, unknown> | null): string {
  if (!detalle) return "";
  const partes: string[] = [];
  if (typeof detalle.anterior !== "undefined" && typeof detalle.nuevo !== "undefined") {
    partes.push(`${detalle.anterior} → ${detalle.nuevo}`);
  }
  for (const [clave, valor] of Object.entries(detalle)) {
    // manzana/lote ya se muestran en la columna Entidad, no hace falta repetirlos acá.
    if (clave === "anterior" || clave === "nuevo" || clave === "manzana" || clave === "lote") continue;
    partes.push(`${clave}: ${valor}`);
  }
  return partes.join(", ");
}

export default async function AdminActividadPage() {
  const registros = await getActividadLog(200);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Registro de actividad</h1>
      <p className="mt-1 text-sm text-brand-black/60">Auditoría de las acciones realizadas desde el panel administrador.</p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">Entidad</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} className="border-b border-black/5 last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{new Date(r.creadoEn).toLocaleString("es-AR")}</td>
                <td className="px-4 py-3">{r.usuarioEmail ?? "—"}</td>
                <td className="px-4 py-3">{ACCION_LABEL[r.accion] ?? r.accion}</td>
                <td className="px-4 py-3 text-brand-black/60">
                  {r.entidad}
                  {r.detalle?.manzana || r.detalle?.lote
                    ? ` (${[
                        r.detalle?.manzana ? `Manzana ${r.detalle.manzana}` : null,
                        r.detalle?.lote ? `Lote ${r.detalle.lote}` : null,
                      ]
                        .filter(Boolean)
                        .join(" — ")})`
                    : r.entidadId
                      ? ` (${r.entidadId.slice(0, 8)})`
                      : ""}
                </td>
                <td className="px-4 py-3 text-xs text-brand-black/50">{formatearDetalle(r.detalle)}</td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-black/50">
                  Todavía no hay actividad registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
