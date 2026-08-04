import { Newspaper } from "lucide-react";
import type { Novedad } from "@/lib/content";

export default function Novedades({ novedades }: { novedades: Novedad[] }) {
  if (novedades.length === 0) return null;

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Novedades</h2>
          <p className="mt-3 text-brand-black/70">Las últimas noticias del desarrollo.</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {novedades.map((n) => (
            <article key={n.id} className="rounded-2xl border border-black/5 bg-brand-cream p-6">
              <div className="mb-2 flex items-center gap-2 text-brand-green-700">
                <Newspaper className="h-4 w-4" />
                <time className="text-xs font-medium uppercase tracking-wide">
                  {new Date(n.creadoEn).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                </time>
              </div>
              <h3 className="font-display text-lg font-bold text-brand-black">{n.titulo}</h3>
              <p className="mt-2 text-sm text-brand-black/70">{n.contenido}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
