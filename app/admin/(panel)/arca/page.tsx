import { redirect } from "next/navigation";
import ArcaFacturasManager, { type ClienteCrm } from "@/components/admin/ArcaFacturasManager";
import { getLeads } from "@/lib/admin/data";
import { getPerfilActual } from "@/lib/admin/auth";
import { getDatosPanelArca } from "@/lib/admin/arca-actions";
import { textoWhatsapp } from "@/lib/arca/envio";

export const dynamic = "force-dynamic";

export default async function AdminArcaPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");
  const { lead } = await searchParams;

  let datos;
  try {
    datos = await getDatosPanelArca();
  } catch (err) {
    return <p className="text-sm text-red-700">No se pudo cargar la facturación: {(err as Error).message}</p>;
  }
  const leads = await getLeads();
  const clientes: ClienteCrm[] = leads
    .map((l) => ({
      id: l.id,
      nombre: [l.apellido, l.nombre].filter(Boolean).join(" ").trim() || l.nombre,
      dni: l.dni ?? null,
      email: l.email || null,
      telefono: l.telefono || null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const linkWhatsapp: Record<string, string> = {};
  for (const f of datos.facturas) {
    if (f.estado !== "autorizada") continue;
    let tel = (f.receptorTelefono ?? "").replace(/\D/g, "");
    if (tel && !tel.startsWith("54")) tel = `549${tel.replace(/^0/, "").replace(/^15/, "11")}`;
    linkWhatsapp[f.id] = `https://wa.me/${tel}?text=${encodeURIComponent(textoWhatsapp(f))}`;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">ARCA - Facturas</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Facturas C electrónicas con CAE: se generan solas desde los cobros acreditados (señas y honorarios de cobranza) o se cargan a
        mano. Pesos o dólares, con nota de crédito para anular.
      </p>
      <div className="mt-8">
        <ArcaFacturasManager datos={datos} clientes={clientes} leadInicial={lead ?? null} linkWhatsapp={linkWhatsapp} />
      </div>
    </div>
  );
}
