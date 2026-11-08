import Link from "next/link";
import type { SiteTextos } from "@/types/site";
import { PARTIDOS } from "@/lib/zonas";

export default function Footer({ textos }: { textos: SiteTextos }) {
  return (
    <footer className="border-t border-white/10 bg-brand-black py-8 text-center text-sm text-white/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] font-semibold text-white/70">
          {[
            ["/", "Inicio"],
            ["/comprar", "Comprar"],
            ["/alquilar", "Alquilar"],
            ["/campos", "Campos"],
            ["/desarrollos", "Desarrollos"],
            ["/zonas", "Zonas"],
            ["/tasaciones", "Tasaciones"],
            ["/propietarios", "Alquilá o vendé tu propiedad"],
            ["/visitas", "Agendar visita"],
            ["/postulantes", "Trabajá con nosotros"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Inmobiliaria por localidad" className="mb-6 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-white/45">
          {PARTIDOS.map((p) => (
            <Link key={p.slug} href={`/inmobiliaria/${p.slug}`} className="hover:text-white/80">
              Inmobiliaria en {p.nombre}
            </Link>
          ))}
        </nav>
        <p className="font-semibold uppercase tracking-wide text-white/80">Inmobiliaria</p>
        <p className="font-semibold uppercase tracking-wide text-white/80">De Nunzio Negocios Inmobiliarios</p>
        <p className="mt-1 uppercase tracking-wide text-white/70">Matías De Nunzio · Martillero Público</p>
        <p className="mt-3">© {new Date().getFullYear()} Matu Lotes. Todos los derechos reservados.</p>
        <p className="mt-1">
          {textos.email}
          {textos.telefonoOficina && ` · Oficina: ${textos.telefonoOficina}`} ·{" "}
          <Link href="/politica-de-privacidad" className="hover:text-white/80">
            Política de privacidad
          </Link>{" "}
          ·{" "}
          <Link href="/admin/crm" className="hover:text-white/80">
            Panel administrador
          </Link>
        </p>
      </div>
    </footer>
  );
}
