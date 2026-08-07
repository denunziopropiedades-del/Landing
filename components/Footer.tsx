import Link from "next/link";
import type { SiteTextos } from "@/types/site";

export default function Footer({ textos }: { textos: SiteTextos }) {
  return (
    <footer className="border-t border-white/10 bg-brand-black py-8 text-center text-sm text-white/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Matu Lotes. Todos los derechos reservados.</p>
        <p className="mt-1">
          {textos.email}
          {textos.telefonoOficina && ` · Oficina: ${textos.telefonoOficina}`} ·{" "}
          <Link href="/politica-de-privacidad" className="hover:text-white/80">
            Política de privacidad
          </Link>{" "}
          ·{" "}
          <Link href="/admin" className="hover:text-white/80">
            Panel administrador
          </Link>
        </p>
      </div>
    </footer>
  );
}
