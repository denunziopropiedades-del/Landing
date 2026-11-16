import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { INSTITUCION, fechaAr } from "@/lib/docs-clientes/compartido";
import { EncabezadoInstitucional, PieInstitucional } from "@/components/docs-clientes/Institucional";
import { caracteristicas, descripcionInmueble, informeEfectivo, mapTasacion, promedioComparables, unitarioComparable, usd } from "@/lib/tasador";

export const metadata: Metadata = {
  title: "Informe de tasación",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

/** Informe comparativo de tasación aprobado por la inmobiliaria (link privado para el propietario). */
export default async function InformeTasacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = await getSupabaseAdminClient();
  const { data } =
    admin && /^[A-Za-z0-9_-]{20,60}$/.test(token)
      ? await admin.from("tasaciones").select("*").eq("informe_token", token).maybeSingle()
      : { data: null };

  if (!data || !data.informe_aprobado_en) {
    return (
      <main className="min-h-screen bg-slate-50 pb-12">
        <EncabezadoInstitucional titulo="Enlace no disponible" />
        <p className="mx-auto max-w-md p-6 text-center text-sm text-slate-600">
          Este enlace no existe o fue dado de baja. Escribinos por WhatsApp al {INSTITUCION.whatsapp[0]}.
        </p>
        <PieInstitucional />
      </main>
    );
  }

  const t = mapTasacion(data);
  const inf = informeEfectivo(t);
  const unidad = t.resultado.unidad ?? "m²";
  const promedio = promedioComparables(inf.comparables);
  const unitario = t.resultado.superficie > 0 ? inf.central / t.resultado.superficie : 0;
  const pdfUrl = `/api/tasador/informe/${token}/pdf`;

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <EncabezadoInstitucional titulo="Informe de tasación" sub={t.nombre} />
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Inmueble</p>
          <p className="text-lg font-bold text-slate-900">{descripcionInmueble(t)}</p>
          <p className="text-xs text-slate-500">Informe del {fechaAr(t.informeAprobadoEn)}</p>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            {caracteristicas(t).map((c) => (
              <div key={c.etiqueta} className="flex justify-between gap-4 py-2">
                <dt className="text-slate-500">{c.etiqueta}</dt>
                <dd className="text-right font-medium text-slate-900">{c.valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl bg-[#0f1b2d] p-5 text-center text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/60">Valor de mercado estimado</p>
          <p className="font-display text-4xl font-bold text-[#6cc72f]">{usd(inf.central)}</p>
          {unitario > 0 && (
            <p className="mt-1 text-xs text-white/60">
              {usd(Math.round(unitario))} por {unidad}
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-left">
            {[
              { titulo: "Mínimo", valor: inf.minimo },
              { titulo: "Máximo", valor: inf.maximo },
              { titulo: "Publicar en", valor: inf.publicacion },
            ].map((v) => (
              <div key={v.titulo} className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] uppercase text-white/60">{v.titulo}</p>
                <p className="text-sm font-bold sm:text-base">{usd(v.valor)}</p>
              </div>
            ))}
          </div>
        </section>

        {inf.comparables.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-900">Propiedades comparables</p>
            <div className="mt-3 space-y-3">
              {inf.comparables.map((c, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{c.descripcion}</p>
                  {/^https?:\/\//.test(c.fuente) ? (
                    <a href={c.fuente} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-xs text-[#16294f] underline">
                      Ver publicación
                    </a>
                  ) : (
                    c.fuente && <p className="text-xs text-slate-500">{c.fuente}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
                    <span>
                      <b>{usd(c.precio)}</b>
                    </span>
                    {c.superficie > 0 && (
                      <span>
                        {c.superficie.toLocaleString("es-AR")} {unidad}
                      </span>
                    )}
                    {unitarioComparable(c) > 0 && (
                      <span>
                        {usd(Math.round(unitarioComparable(c)))}/{unidad}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {promedio > 0 && unitario > 0 && (
              <dl className="mt-4 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">Promedio de comparables</dt>
                  <dd className="font-medium text-slate-900">
                    {usd(Math.round(promedio))}/{unidad}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">Tu propiedad</dt>
                  <dd className="font-bold text-slate-900">
                    {usd(Math.round(unitario))}/{unidad}
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-2 text-xs text-slate-500">Los comparables son precios de publicación, no operaciones cerradas.</p>
          </section>
        )}

        {inf.observaciones && (
          <section className="rounded-2xl bg-white p-5 text-sm shadow-sm">
            <p className="font-bold text-slate-900">Observaciones</p>
            <p className="mt-1 whitespace-pre-line text-slate-700">{inf.observaciones}</p>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Informe completo</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#16294f] px-4 py-2.5 text-center text-sm font-semibold text-[#16294f]">
              Ver PDF
            </a>
            <a href={`${pdfUrl}?descargar=1`} className="rounded-full bg-[#16294f] px-4 py-2.5 text-center text-sm font-semibold text-white">
              Descargar
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Estimación profesional de valor a la fecha indicada, sujeta a la inspección del inmueble y a la verificación de su documentación.
          </p>
        </section>

        <a
          href={`https://wa.me/${INSTITUCION.whatsappIntl}?text=${encodeURIComponent(`Hola, vi el informe de tasación de ${descripcionInmueble(t)} y quiero avanzar con la venta.`)}`}
          className="block rounded-full bg-[#25d366] px-6 py-3 text-center font-semibold text-white shadow-sm"
        >
          Quiero vender: hablar por WhatsApp
        </a>
      </div>
      <PieInstitucional />
    </main>
  );
}
