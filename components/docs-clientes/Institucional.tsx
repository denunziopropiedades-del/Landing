import { INSTITUCION } from "@/lib/docs-clientes/core";

export function EncabezadoInstitucional({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <header className="bg-[#0f1b2d] px-4 py-8 text-center text-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6cc72f]">De Nunzio</p>
      <p className="text-sm font-semibold tracking-wide text-white/80">NEGOCIOS INMOBILIARIOS</p>
      <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{titulo}</h1>
      {sub && <p className="mt-1 text-sm text-white/70">{sub}</p>}
    </header>
  );
}

export function PieInstitucional() {
  return (
    <footer className="mx-auto mt-8 max-w-2xl px-4 text-center text-xs text-slate-500">
      <p className="font-semibold text-slate-700">{INSTITUCION.nombre}</p>
      <p>
        {INSTITUCION.titulo} · {INSTITUCION.matricula}
      </p>
      <p>WhatsApp: {INSTITUCION.whatsapp.join(" / ")}</p>
      <p className="mt-2">{INSTITUCION.leyenda}</p>
    </footer>
  );
}

export const CLASE_ESTADO: Record<string, string> = {
  emitido: "bg-slate-100 text-slate-700",
  enviado: "bg-amber-100 text-amber-800",
  aceptado: "bg-emerald-100 text-emerald-800",
  rechazado: "bg-red-100 text-red-800",
  vencido: "bg-slate-200 text-slate-700",
  anulado: "bg-red-600 text-white",
};
