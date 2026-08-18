"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

export default function ImportarExcelForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCargando(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      const res = await fetch("/api/postulantes/importar", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        alert(body.error ?? "No se pudo importar el archivo.");
        return;
      }
      alert(`Importación completa: ${body.creados} nuevos, ${body.actualizados} actualizados, ${body.omitidos} omitidos.`);
      window.location.reload();
    } catch {
      alert("No se pudo importar el archivo.");
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-obra-slate-950 transition hover:bg-slate-50">
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Importar Excel
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onChange} disabled={cargando} />
    </label>
  );
}
