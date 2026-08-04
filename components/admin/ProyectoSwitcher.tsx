"use client";

import { useRouter } from "next/navigation";
import type { Proyecto } from "@/types/site";

export default function ProyectoSwitcher({
  proyectos,
  actual,
  basePath,
}: {
  proyectos: Proyecto[];
  actual: string;
  basePath: string;
}) {
  const router = useRouter();

  if (proyectos.length === 0) return null;

  return (
    <div className="mb-6 flex items-center gap-3">
      <label className="text-sm font-medium text-brand-black/70">Proyecto:</label>
      <select
        value={actual}
        onChange={(e) => router.push(`${basePath}?proyecto=${e.target.value}`)}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none"
      >
        {proyectos.map((p) => (
          <option key={p.id} value={p.slug}>
            {p.nombre} {p.publicado ? "" : "(sin publicar)"}
          </option>
        ))}
      </select>
    </div>
  );
}
