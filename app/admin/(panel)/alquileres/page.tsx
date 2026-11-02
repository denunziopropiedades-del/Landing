import { redirect } from "next/navigation";
import AlquileresManager from "@/components/admin/AlquileresManager";
import { getPerfilActual } from "@/lib/admin/auth";
import { getAlquileresAdmin } from "@/lib/admin/alquileres-actions";

export const dynamic = "force-dynamic";

export default async function AdminAlquileresPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");
  const { faltaSql, ...datos } = await getAlquileresAdmin();
  const sitio = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Administración de alquileres</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Contratos, cobros mensuales con recibo, expensas y servicios, liquidaciones a propietarios y el link de cada inquilino y propietario para ver su cuenta.
      </p>
      {faltaSql && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta crear las tablas: corré <b>sql-alquileres.sql</b> en Supabase (SQL Editor) y recargá esta página.
        </p>
      )}
      <div className="mt-6">
        <AlquileresManager datos={datos} sitio={sitio} />
      </div>
    </div>
  );
}
