"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

/**
 * Botón + formulario para descargar los pagarés de las cuotas de un cliente (uno por hoja).
 * Se usa en Cobranzas y en Reservas: ambos llaman al mismo endpoint y comparten los
 * datos del beneficiario guardados por desarrollo, así todo queda sincronizado.
 */

function hoyIso() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
}

type ConfigPagares = {
  beneficiario: string;
  tipoDoc: "CUIT" | "CUIL";
  doc: string;
  lugarPago: string;
  lugarEmision: string;
};

const CONFIG_PAGARES_VACIA: ConfigPagares = {
  beneficiario: "",
  tipoDoc: "CUIT",
  doc: "",
  lugarPago: "",
  lugarEmision: "San Vicente, Provincia de Buenos Aires",
};

/** Los datos del beneficiario se recuerdan por desarrollo en este navegador. */
const clavePagares = (proyecto?: string) => `pagares:${proyecto ?? "general"}`;

function leerConfigPagares(proyecto?: string): ConfigPagares {
  try {
    const raw = localStorage.getItem(clavePagares(proyecto)) ?? localStorage.getItem(clavePagares());
    return raw ? { ...CONFIG_PAGARES_VACIA, ...JSON.parse(raw) } : CONFIG_PAGARES_VACIA;
  } catch {
    return CONFIG_PAGARES_VACIA;
  }
}

/** Descarga los pagarés de las cuotas (una por hoja) para que los firme el deudor. */
export default function DescargarPagares({
  leadId,
  proyecto,
  cuotasTotal,
  cuotasPendientes,
}: {
  leadId: string;
  proyecto?: string | null;
  cuotasTotal: number;
  cuotasPendientes: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cfg, setCfg] = useState<ConfigPagares>(CONFIG_PAGARES_VACIA);
  const [cuales, setCuales] = useState<"pendientes" | "todas">("pendientes");
  const [aval, setAval] = useState(true);
  const [fecha, setFecha] = useState(hoyIso());
  const pendientes = cuotasPendientes;

  const abrir = () => {
    setCfg(leerConfigPagares(proyecto ?? undefined));
    setAbierto(true);
  };
  const set = (k: keyof ConfigPagares, v: string) => setCfg((c) => ({ ...c, [k]: v }));
  const digitos = cfg.doc.replace(/\D/g, "");
  const docValido = digitos.length === 11;
  const listo = cfg.beneficiario.trim() && docValido && cfg.lugarPago.trim();
  const cantidad = cuales === "pendientes" ? pendientes : cuotasTotal;

  const descargar = () => {
    if (!listo) return;
    try {
      const json = JSON.stringify(cfg);
      localStorage.setItem(clavePagares(proyecto ?? undefined), json);
      localStorage.setItem(clavePagares(), json);
    } catch {
      // sin almacenamiento local: se pide de nuevo la próxima vez
    }
    const q = new URLSearchParams({
      beneficiario: cfg.beneficiario,
      tipoDoc: cfg.tipoDoc,
      doc: cfg.doc,
      lugarPago: cfg.lugarPago,
      lugarEmision: cfg.lugarEmision,
      fecha,
      cuotas: cuales,
      aval: aval ? "1" : "0",
    });
    window.open(`/api/admin/cobranzas/${leadId}/pagares?${q.toString()}`, "_blank");
  };

  if (!abierto)
    return (
      <div className="border-t border-black/5 px-4 py-3">
        <button
          type="button"
          onClick={abrir}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-green-700/30 px-3 py-1.5 text-xs font-semibold text-brand-green-700 hover:bg-brand-green-700/5"
        >
          <FileText className="h-3.5 w-3.5" /> Descargar pagarés
        </button>
      </div>
    );

  const input = "w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm";
  return (
    <div className="space-y-3 border-t border-black/5 p-4 text-xs">
      <p className="font-medium text-brand-black/50">Pagarés de las cuotas — uno por hoja, para firma del deudor</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-brand-black/60">Beneficiario (a quien se le paga — la desarrolladora)</span>
          <input className={input} value={cfg.beneficiario} onChange={(e) => set("beneficiario", e.target.value)} placeholder="Razón social o nombre completo" />
        </label>
        <label className="space-y-1">
          <span className="text-brand-black/60">Tipo de documento</span>
          <select className={input} value={cfg.tipoDoc} onChange={(e) => set("tipoDoc", e.target.value)}>
            <option value="CUIT">CUIT</option>
            <option value="CUIL">CUIL</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-brand-black/60">N.º de {cfg.tipoDoc}</span>
          <input className={input} inputMode="numeric" value={cfg.doc} onChange={(e) => set("doc", e.target.value)} placeholder="30-12345678-9" />
          {cfg.doc && !docValido && <span className="text-red-600">Tiene que tener 11 números.</span>}
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-brand-black/60">Lugar de pago</span>
          <input className={input} value={cfg.lugarPago} onChange={(e) => set("lugarPago", e.target.value)} placeholder="Calle y número, localidad, Provincia de Buenos Aires" />
        </label>
        <label className="space-y-1">
          <span className="text-brand-black/60">Lugar de emisión</span>
          <input className={input} value={cfg.lugarEmision} onChange={(e) => set("lugarEmision", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-brand-black/60">Fecha de emisión (la de la firma)</span>
          <input type="date" className={input} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-brand-black/60">Cuotas</span>
          <select className={input} value={cuales} onChange={(e) => setCuales(e.target.value as "pendientes" | "todas")}>
            <option value="pendientes">Solo pendientes ({pendientes})</option>
            <option value="todas">Todas ({cuotasTotal})</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-brand-black/70">
          <input type="checkbox" checked={aval} onChange={(e) => setAval(e.target.checked)} className="h-4 w-4 accent-brand-green-700" />
          Incluir lugar para firma de garante (aval)
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={descargar}
          disabled={!listo || cantidad === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
        >
          <FileText className="h-3.5 w-3.5" /> Descargar {cantidad} pagaré{cantidad === 1 ? "" : "s"} (PDF)
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-brand-black/40">
          Cerrar
        </button>
      </div>
      <p className="text-[11px] text-brand-black/40">
        El DNI, domicilio y CUIT/CUIL del deudor salen de su ficha (alta de cliente). Si falta alguno, la línea queda en blanco para completar a mano.
      </p>
    </div>
  );
}
