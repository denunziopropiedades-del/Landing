import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verificarTokenBaja } from "@/lib/newsletter";
import { registrarBajaNewsletter } from "@/lib/newsletter-baja";

export const metadata: Metadata = {
  title: "Dejar de recibir promociones",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function confirmarBaja(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  let listo = false;
  try {
    listo = Boolean(await registrarBajaNewsletter(token));
  } catch {
    listo = false;
  }
  redirect(`/newsletter/baja?t=${encodeURIComponent(token)}&${listo ? "listo=1" : "error=1"}`);
}

export default async function BajaNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; listo?: string; error?: string }>;
}) {
  const { t = "", listo, error } = await searchParams;
  const email = verificarTokenBaja(t);

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-brand-black py-10 text-center text-white">
        <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-brand-gold-400">
          Matu Lotes
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Promociones por email</h1>
      </header>
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl bg-white p-7 text-center shadow-sm">
          {!email ? (
            <p className="text-brand-black/75">Este link no es válido o está incompleto.</p>
          ) : listo ? (
            <>
              <p className="font-display text-xl font-bold text-brand-black">Listo, te dimos de baja</p>
              <p className="mt-2 text-sm text-brand-black/70">
                No vas a recibir más promociones en <b>{email}</b>. Si fue un error, escribinos y te volvemos a sumar.
              </p>
            </>
          ) : (
            <>
              <p className="text-brand-black/80">
                ¿Querés dejar de recibir nuestras promociones en <b>{email}</b>?
              </p>
              {error && <p className="mt-3 text-sm text-red-600">No pudimos registrar la baja. Probá de nuevo en un rato.</p>}
              <form action={confirmarBaja} className="mt-6">
                <input type="hidden" name="t" value={t} />
                <button
                  type="submit"
                  className="min-h-[48px] w-full rounded-full bg-brand-black px-6 font-semibold text-white"
                >
                  Sí, darme de baja
                </button>
              </form>
            </>
          )}
          <Link href="/" className="mt-5 block text-sm font-semibold text-brand-green-700 underline">
            Ir a matulotes.app
          </Link>
        </div>
      </div>
    </main>
  );
}
