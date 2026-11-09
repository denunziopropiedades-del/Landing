import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { resolverLinkFirma } from "@/lib/firma-escribania";
import ElegirFirma from "@/components/firma/ElegirFirma";

export const metadata: Metadata = {
  title: "Elegí el día de tu firma",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FirmaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = await getSupabaseAdminClient();
  const lead = admin ? await resolverLinkFirma(admin, token) : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-[#0f1b2d] px-4 py-8 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6cc72f]">De Nunzio Negocios Inmobiliarios</p>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Firma en escribanía</h1>
        <p className="mt-1 text-sm text-white/70">Elegí el día y horario que te queden mejor</p>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        {lead ? (
          <ElegirFirma token={token} />
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
            Este link venció o ya no es válido. Pedí uno nuevo por WhatsApp al <b>11-2742-4512</b>.
          </p>
        )}
        <p className="mt-6 text-center text-xs text-slate-400">Matías De Nunzio · Martillero Público · Matrícula COL 7886</p>
      </div>
    </main>
  );
}
