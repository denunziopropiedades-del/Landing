import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { verificarTokenReprogramacion } from "@/lib/visitas";
import ReprogramarVisita from "@/components/ReprogramarVisita";

export const metadata: Metadata = {
  title: "Reprogramar visita",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReprogramarVisitaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visitaId = verificarTokenReprogramacion(token);
  const supabase = visitaId ? await getSupabaseAdminClient() : null;

  const { data: visita } =
    supabase && visitaId
      ? await supabase
          .from("visitas")
          .select("nombre, fecha, horario, estado, proyectos(nombre)")
          .eq("id", visitaId)
          .maybeSingle()
      : { data: null };

  const proyecto = visita?.proyectos as unknown as { nombre: string } | null;
  const reprogramable = visita && visita.estado !== "cancelada" && visita.estado !== "realizada";

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-brand-black py-10 text-center text-white">
        <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-brand-gold-400">
          Matu Lotes
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Reprogramar visita</h1>
        {proyecto?.nombre && <p className="mt-1 text-sm text-white/70">{proyecto.nombre}</p>}
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {!visita ? (
          <Aviso titulo="Link no válido" texto="No encontramos la visita. Escribinos por WhatsApp y la coordinamos." />
        ) : !reprogramable ? (
          <Aviso
            titulo="Esta visita ya no se puede reprogramar"
            texto="Escribinos por WhatsApp y coordinamos un nuevo horario."
          />
        ) : (
          <ReprogramarVisita
            token={token}
            nombre={visita.nombre}
            fechaActual={visita.fecha}
            horarioActual={visita.horario}
          />
        )}
      </div>
    </main>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
      <p className="font-display text-xl font-bold text-brand-black">{titulo}</p>
      <p className="mt-2 text-sm text-brand-black/70">{texto}</p>
      <a
        href="/api/whatsapp"
        target="_blank"
        rel="noopener"
        className="mt-5 inline-flex rounded-full bg-brand-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-600"
      >
        Escribir por WhatsApp
      </a>
    </div>
  );
}
