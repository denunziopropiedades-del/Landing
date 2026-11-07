import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EncabezadoInstitucional, PieInstitucional } from "@/components/docs-clientes/Institucional";

export const metadata: Metadata = { title: "Verificación de documento", robots: { index: false, follow: false } };

async function ir(formData: FormData) {
  "use server";
  const codigo = String(formData.get("codigo") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  redirect(`/verificar/${codigo || "-"}`);
}

export default function VerificarInicio() {
  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <EncabezadoInstitucional titulo="Verificación de documento" />
      <form action={ir} className="mx-auto mt-6 max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800">
          Código de verificación (figura junto al QR del documento)
          <input name="codigo" required maxLength={12} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase tracking-widest" />
        </label>
        <button type="submit" className="w-full rounded-full bg-[#16294f] px-6 py-3 font-semibold text-white">
          Verificar
        </button>
      </form>
      <PieInstitucional />
    </main>
  );
}
