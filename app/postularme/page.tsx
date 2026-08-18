import type { Metadata } from "next";
import { HardHat } from "lucide-react";
import FormularioPostulacion from "@/components/candidatos/FormularioPostulacion";

export const metadata: Metadata = {
  title: { absolute: "Postulate | Selección de personal para construcción" },
  description: "Sumate a nuestra base de trabajadores de albañilería y construcción. Completá tus datos en minutos.",
};

export default function PostularmePage() {
  return (
    <main className="min-h-screen bg-obra-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-obra-orange-500/15">
            <HardHat className="h-7 w-7 text-obra-orange-400" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Postulate para trabajar con nosotros</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
            Buscamos ayudantes, medio oficiales, oficiales y oficiales especializados en construcción. Completá tus
            datos, es rápido y desde el celular.
          </p>
        </div>

        <FormularioPostulacion />
      </div>
    </main>
  );
}
