import Link from "next/link";
import Image from "next/image";
import { Bath, BedDouble, Droplets, House, MapPin, Maximize2, Wheat, Zap } from "lucide-react";
import { esRural, formatearPrecio, labelTipo, ubicacionTexto, type Propiedad } from "@/lib/propiedades";

export default function PropiedadCard({ propiedad: p }: { propiedad: Propiedad }) {
  const rural = esRural(p.tipo);
  const etiquetaOp = rural
    ? `${labelTipo(p.tipo)} · ${p.operacion === "venta" ? "Venta" : "Arriendo"}`
    : p.operacion === "venta"
      ? "Venta"
      : "Alquiler";
  const colorOp = rural ? "bg-[#7a5a1c]" : p.operacion === "venta" ? "bg-brand-green-700" : "bg-[#2f5d8a]";
  const etiquetaFoto = p.aptoCredito ? "Apto crédito" : p.etiquetas[0];

  return (
    <Link
      href={`/propiedades/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-cream">
        {p.fotos[0] ? (
          <Image
            src={p.fotos[0]}
            alt={p.titulo}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-black/20">
            {rural ? <Wheat className="h-14 w-14" /> : <House className="h-14 w-14" />}
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white ${colorOp}`}>
          {etiquetaOp}
        </span>
        {etiquetaFoto && (
          <span className="absolute bottom-3 left-3 rounded-md bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white">
            {etiquetaFoto}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {rural && p.hectareas ? (
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-brand-black">{fmt(p.hectareas)} ha</span>
            <span className="text-sm font-bold text-[#6b5a2a]">{formatearPrecio(p)}</span>
          </p>
        ) : (
          <p className="text-xl font-extrabold text-brand-black">{formatearPrecio(p)}</p>
        )}
        <h3 className="mt-0.5 line-clamp-1 font-semibold text-brand-black">{p.titulo}</h3>
        <p className="mb-3 mt-0.5 flex items-center gap-1 text-[13px] text-brand-black/60">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {ubicacionTexto(p)}
        </p>

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-black/5 pt-3 text-[13px] text-brand-black/75 [&>span]:flex [&>span]:items-center [&>span]:gap-1.5">
          {rural ? (
            <>
              {p.aptitud && (
                <span>
                  <Wheat className="h-3.5 w-3.5" />
                  {p.aptitud}
                </span>
              )}
              {p.agua && (
                <span>
                  <Droplets className="h-3.5 w-3.5" />
                  {p.agua}
                </span>
              )}
              {p.luz !== null && (
                <span>
                  <Zap className="h-3.5 w-3.5" />
                  {p.luz ? "Con luz" : "Sin luz"}
                </span>
              )}
            </>
          ) : (
            <>
              {p.ambientes ? (
                <span>
                  <BedDouble className="h-3.5 w-3.5" />
                  {p.ambientes} amb.
                </span>
              ) : null}
              {p.supCubierta || p.supTotal ? (
                <span>
                  <Maximize2 className="h-3.5 w-3.5" />
                  {fmt((p.supCubierta ?? p.supTotal)!)} m²
                </span>
              ) : null}
              {p.banos ? (
                <span>
                  <Bath className="h-3.5 w-3.5" />
                  {p.banos} baño{p.banos > 1 ? "s" : ""}
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
}
