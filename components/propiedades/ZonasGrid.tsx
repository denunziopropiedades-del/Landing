import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { ZONAS } from "@/lib/zonas";

type Conteo = Record<string, { venta: number; alquiler: number; campos: number }>;

/** Tarjetas de las 4 zonas del Departamento Judicial La Plata. */
export default function ZonasGrid({ conteo = {} }: { conteo?: Conteo }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ZONAS.map((z) => {
        const total = z.partidos.reduce(
          (acc, p) => {
            const c = conteo[p.slug];
            if (c) {
              acc.venta += c.venta;
              acc.alquiler += c.alquiler;
              acc.campos += c.campos;
            }
            return acc;
          },
          { venta: 0, alquiler: 0, campos: 0 }
        );
        const hayConteo = total.venta + total.alquiler + total.campos > 0;
        return (
          <Link
            key={z.slug}
            href={`/zonas/${z.slug}`}
            className={`group relative overflow-hidden rounded-3xl p-6 text-white transition hover:-translate-y-1 hover:shadow-xl ${z.color}`}
          >
            <MapPin className="absolute -bottom-6 -right-4 h-36 w-36 opacity-10" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">Zona</p>
            <h3 className="mt-0.5 font-display text-2xl font-bold">{z.nombre}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {z.partidos.map((p) => (
                <span key={p.slug} className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold">
                  {p.nombre}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 text-[13px] font-semibold">
              {hayConteo ? (
                <span>
                  {[
                    total.venta > 0 ? `${total.venta} en venta` : null,
                    total.alquiler > 0 ? `${total.alquiler} en alquiler` : null,
                    total.campos > 0 ? `${total.campos} campos` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : (
                <span className="opacity-85">Ver propiedades de la zona</span>
              )}
              <ChevronRight className="ml-auto h-5 w-5 transition group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
