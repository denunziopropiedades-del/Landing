import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { cargarPortalCuotas } from "@/lib/mis-cuotas";

export const metadata: Metadata = {
  title: "Mis cuotas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const monto = (n: number, moneda: "USD" | "ARS") => {
  const v = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
  return moneda === "ARS" ? `$ ${v}` : `USD ${v}`;
};

const fecha = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(d);
};

const hoyAr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

const dias = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000);

function Encabezado({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <header className="bg-[#0f1b2d] px-4 py-8 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6cc72f]">De Nunzio Negocios Inmobiliarios</p>
      <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{titulo}</h1>
      {sub && <p className="mt-1 text-sm text-white/70">{sub}</p>}
    </header>
  );
}

export default async function MisCuotasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = await getSupabaseAdminClient();
  const portal = admin ? await cargarPortalCuotas(admin, token) : null;

  if (!portal) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Encabezado titulo="Link no válido" />
        <p className="mx-auto max-w-md p-6 text-center text-sm text-slate-600">
          Este link no existe o fue renovado. Pedile a la inmobiliaria tu link actualizado por WhatsApp al 11-2742-4512.
        </p>
      </main>
    );
  }

  const hoy = hoyAr();
  const m = portal.moneda;
  const pagadas = portal.cuotas.filter((c) => c.pagada);
  const pendientes = portal.cuotas.filter((c) => !c.pagada).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  const vencidas = pendientes.filter((c) => c.vencimiento < hoy);
  const proxima = pendientes.find((c) => c.vencimiento >= hoy) ?? null;
  const total = portal.totalCuotas || portal.cuotas.length;
  const pct = total ? Math.round((pagadas.length / total) * 100) : 0;
  const totalPagado = pagadas.reduce((s, c) => s + (c.montoPagadoUsd ?? c.montoUsd), 0);
  const saldo = pendientes.reduce((s, c) => s + c.montoUsd, 0);
  const deuda = vencidas.reduce((s, c) => s + c.montoUsd, 0);
  const wa = `https://wa.me/5491127424512?text=${encodeURIComponent(`Hola, soy ${portal.nombre}. Consulta sobre mis cuotas${portal.proyecto ? ` de ${portal.proyecto}` : ""}.`)}`;

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <Encabezado titulo="Mis cuotas" sub={portal.nombre} />
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          {portal.proyecto && <p className="text-xs font-semibold uppercase text-slate-500">{portal.proyecto}</p>}
          {portal.lotes.length > 0 && (
            <p className="text-lg font-bold text-slate-900">
              {portal.lotes.map((l) => `Manzana ${l.manzana} · Lote ${l.numero}`).join(" / ")}
            </p>
          )}
          {portal.ubicacion && <p className="text-sm text-slate-500">{portal.ubicacion}</p>}

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <p className="text-sm font-semibold text-slate-700">Cuotas pagas</p>
              <p className="font-display text-3xl font-bold text-slate-900">
                {pagadas.length}
                <span className="text-lg font-semibold text-slate-400"> de {total}</span>
              </p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#6cc72f]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-slate-500">{pct}% del plan</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Pagado en cuotas</p>
              <p className="font-semibold text-slate-900">{monto(totalPagado, m)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Saldo pendiente</p>
              <p className="font-semibold text-slate-900">{monto(saldo, m)}</p>
            </div>
          </div>
        </section>

        {vencidas.length > 0 && (
          <section className="rounded-2xl bg-red-600 p-5 text-white shadow-sm">
            <p className="text-base font-bold">
              Tenés {vencidas.length} cuota{vencidas.length === 1 ? "" : "s"} vencida{vencidas.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm">
              Total vencido: <b>{monto(deuda, m)}</b>. Escribinos para regularizar.
            </p>
          </section>
        )}

        {proxima ? (
          <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-amber-800">Próxima cuota</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900">{monto(proxima.montoUsd, m)}</p>
            <p className="text-sm text-slate-700">
              Cuota {proxima.numero} de {total} · vence el <b>{fecha(proxima.vencimiento)}</b>
              {(() => {
                const d = dias(hoy, proxima.vencimiento);
                return d === 0 ? " (hoy)" : d === 1 ? " (mañana)" : ` (en ${d} días)`;
              })()}
            </p>
          </section>
        ) : (
          pendientes.length === 0 &&
          portal.cuotas.length > 0 && (
            <section className="rounded-2xl bg-emerald-600 p-5 text-center text-white shadow-sm">
              <p className="text-lg font-bold">¡Plan terminado!</p>
              <p className="text-sm">Abonaste todas las cuotas de tu plan.</p>
            </section>
          )
        )}

        {portal.cuotas.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">
            Todavía no se generaron tus cuotas. Te avisamos cuando estén listas.
          </p>
        ) : (
          <section className="rounded-2xl bg-white p-2 shadow-sm">
            <p className="px-3 pt-3 text-sm font-bold text-slate-900">Detalle de cuotas</p>
            <ul className="divide-y divide-slate-100">
              {portal.cuotas.map((c) => {
                const vencida = !c.pagada && c.vencimiento < hoy;
                return (
                  <li key={c.numero} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">
                        Cuota {c.numero} · {monto(c.pagada ? c.montoPagadoUsd ?? c.montoUsd : c.montoUsd, m)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.pagada ? `Pagada el ${fecha(c.pagadoEn)}` : `Vence el ${fecha(c.vencimiento)}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.pagada
                          ? "bg-emerald-100 text-emerald-800"
                          : vencida
                            ? "bg-red-100 text-red-800"
                            : proxima && c.numero === proxima.numero
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.pagada ? "Pagada" : vencida ? "Vencida" : proxima && c.numero === proxima.numero ? "Próxima" : "Pendiente"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <a
          href={wa}
          className="block rounded-full bg-[#25d366] px-6 py-3 text-center font-semibold text-white shadow-sm"
        >
          Consultas por WhatsApp
        </a>
      </div>
    </main>
  );
}
