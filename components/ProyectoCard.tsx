import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Proyecto } from "@/types/site";

export default function ProyectoCard({ proyecto }: { proyecto: Proyecto }) {
  return (
    <Link
      href={`/proyectos/${proyecto.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-black">
        {proyecto.imagenPortada && (
          <Image
            src={proyecto.imagenPortada}
            alt={proyecto.nombre}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {proyecto.destacado && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-black">
            Destacado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-bold text-brand-black">{proyecto.nombre}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-black/60">
          <MapPin className="h-4 w-4" />
          {proyecto.ubicacion}
        </p>
        <p className="mt-3 line-clamp-2 text-sm text-brand-black/70">{proyecto.descripcion}</p>
        <span className="mt-4 text-sm font-semibold text-brand-green-700 group-hover:underline">Ver proyecto →</span>
      </div>
    </Link>
  );
}
