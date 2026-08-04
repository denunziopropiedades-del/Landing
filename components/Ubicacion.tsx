import { MapPin } from "lucide-react";
import type { DistanciaAcceso } from "@/types/site";

const MAPS_EMBED_URL =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ??
  "https://maps.google.com/maps?q=Guernica%2C%20Buenos%20Aires&t=k&z=13&ie=UTF8&iwloc=&output=embed";

export default function Ubicacion({ accesos }: { accesos: DistanciaAcceso[] }) {
  return (
    <section id="ubicacion" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Ubicación</h2>
          <p className="mt-3 text-brand-black/70">
            En Guernica, Buenos Aires, con accesos rápidos a los principales centros urbanos del sur del GBA.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-5">
          <div className="overflow-hidden rounded-2xl border border-black/5 shadow-sm lg:col-span-3">
            <iframe
              title="Ubicación Ayres de Guernica"
              src={MAPS_EMBED_URL}
              width="100%"
              height="420"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="rounded-2xl border border-black/5 bg-brand-cream p-8 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-brand-green-700">
              <MapPin className="h-5 w-5" />
              <span className="font-semibold">Guernica, Buenos Aires</span>
            </div>
            <p className="mb-6 text-sm text-brand-black/70">Tiempos estimados en auto desde el desarrollo:</p>
            <ul className="space-y-3">
              {accesos.map((a) => (
                <li key={a.destino} className="flex items-center justify-between border-b border-black/5 pb-3 text-sm">
                  <span className="font-medium text-brand-black">{a.destino}</span>
                  <span className="rounded-full bg-brand-green-700/10 px-3 py-1 font-semibold text-brand-green-700">
                    {a.tiempo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
