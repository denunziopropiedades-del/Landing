import ImportarLeadsMetaForm from "@/components/admin/ImportarLeadsMetaForm";
import KanbanBoard from "@/components/admin/KanbanBoard";
import NuevoClienteForm from "@/components/admin/NuevoClienteForm";
import LinkAltaCliente from "@/components/admin/LinkAltaCliente";
import { getFinanciacionAdmin, getLeads, getLotesAdminTodos, getPerfiles, getProyectosAdmin } from "@/lib/admin/data";
import { getPerfilActual } from "@/lib/admin/auth";
import { getPropiedadesAdmin } from "@/lib/admin/propiedades-actions";
import { esRural } from "@/lib/propiedades-base";
import GoogleContactosCard, { type EstadoContactos } from "@/components/admin/GoogleContactosCard";
import { oauthConfigurado } from "@/lib/google-contactos";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

async function estadoContactos(resultado: string | null): Promise<EstadoContactos> {
  const base: EstadoContactos = { configurado: oauthConfigurado(), conectado: false, cuenta: null, pendientes: 0, guardados: 0, resultado };
  const a = await getSupabaseAdminClient();
  if (!a) return base;
  const [{ data: cfg }, { count: pendientes }, { count: guardados }] = await Promise.all([
    a.from("google_contactos_config").select("cuenta_email").eq("id", 1).maybeSingle(),
    a.from("leads").select("id", { count: "exact", head: true }).is("google_contacto_id", null),
    a.from("leads").select("id", { count: "exact", head: true }).not("google_contacto_id", "is", null),
  ]);
  return { ...base, conectado: !!cfg, cuenta: (cfg?.cuenta_email as string) ?? null, pendientes: pendientes ?? 0, guardados: guardados ?? 0 };
}

export default async function AdminCrmPage({ searchParams }: { searchParams: Promise<{ contactos?: string }> }) {
  const { contactos } = await searchParams;
  const [leads, perfiles, proyectos, lotes, actual, { propiedades: listaPropiedades }] = await Promise.all([
    getLeads(),
    getPerfiles(),
    getProyectosAdmin(),
    getLotesAdminTodos(),
    getPerfilActual(),
    getPropiedadesAdmin(),
  ]);
  const propiedades = listaPropiedades.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    grupo: esRural(p.tipo) ? ("campo" as const) : p.operacion === "alquiler" ? ("alquiler" as const) : ("venta" as const),
  }));
  // Cualquier miembro activo del staff puede recibir leads asignados, no solo los que
  // tienen el rol puntual "vendedor" (un administrador/supervisor también puede vender).
  const vendedores = perfiles.filter((p) => p.activo);
  // Planes de financiación fijos de cada desarrollo, para ofrecerlos como atajo al
  // marcar un cliente como financiado (igual se puede cargar un plan a medida).
  const planesPorProyecto = Object.fromEntries(
    await Promise.all(proyectos.map(async (p) => [p.id, (await getFinanciacionAdmin(p.id)).planesFijos] as const))
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">CRM — Pipeline de leads</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Arrastrá cada tarjeta entre columnas para actualizar el estado del lead.
      </p>

      <div className="mt-6">
        <LinkAltaCliente />
      </div>

      {actual?.rol === "administrador" && (
        <div className="mt-4">
          <GoogleContactosCard estado={await estadoContactos(contactos ?? null)} />
        </div>
      )}

      <div className="mt-4">
        <NuevoClienteForm proyectos={proyectos} propiedades={propiedades} lotes={lotes} vendedores={vendedores} planesPorProyecto={planesPorProyecto} rolActual={actual?.rol ?? "vendedor"} />
      </div>

      {(actual?.rol === "administrador" || actual?.rol === "supervisor") && (
        <div className="mt-8">
          <ImportarLeadsMetaForm proyectos={proyectos} />
        </div>
      )}

      <div className="mt-8">
        <KanbanBoard planesPorProyecto={planesPorProyecto} leads={leads} vendedores={vendedores} proyectos={proyectos} propiedades={propiedades} lotes={lotes} rolActual={actual?.rol ?? "vendedor"} />
      </div>

      {leads.length === 0 && (
        <p className="mt-8 text-sm text-brand-black/50">
          No hay leads para mostrar. En modo demo (sin Supabase configurado) el CRM no tiene datos persistentes.
        </p>
      )}
    </div>
  );
}
