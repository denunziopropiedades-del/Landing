"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CARGO_LABEL } from "@/lib/candidatos/constants";
import type { IndicadoresCandidatos } from "@/types/candidatos";

export default function GraficoPorCargo({ porCargo }: { porCargo: IndicadoresCandidatos["porCargo"] }) {
  const data = Object.entries(porCargo).map(([cargo, cantidad]) => ({
    cargo: CARGO_LABEL[cargo as keyof typeof CARGO_LABEL],
    cantidad,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="cargo" tick={{ fontSize: 12, fill: "#475569" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
          <Tooltip cursor={{ fill: "#f2790f14" }} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
          <Bar dataKey="cantidad" fill="#f2790f" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
