import { getActividadLog } from "@/lib/admin/data";

const ACCION_LABEL: Record<string, string> = {
  crear: "creó",
  actualizar: "actualizó",
  eliminar: "eliminó",
  publicar: "publicó",
  despublicar: "despublicó",
  "cambiar-estado": "cambió el estado de",
  "cambiar-rol": "cambió el rol de",
  asignar: "asignó",
  anotar: "anotó en",
  activar: "activó",
  desactivar: "desactivó",
  invitar: "invitó a",
};

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
                  {r.entidadId ? ` (${r.entidadId.slice(0, 8)})` : ""}
                </td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-brand-black/50">
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
