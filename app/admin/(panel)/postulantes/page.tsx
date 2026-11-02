import { redirect } from "next/navigation";
import PostulantesManager from "@/components/admin/PostulantesManager";
import { getPerfilActual } from "@/lib/admin/auth";
import { getPostulantes } from "@/lib/admin/postulantes-actions";

export const dynamic = "force-dynamic";

export default async function AdminPostulantesPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");

  const { postulantes, faltaTabla } = await getPostulantes();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Postulantes</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Recursos humanos: las postulaciones que llegan desde{" "}
        <a href="/postulantes" target="_blank" className="font-semibold text-brand-green-700 underline">
          Trabajá con nosotros
        </a>
        .
      </p>
      {faltaTabla && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta correr <b>sql-postulantes.sql</b> en Supabase (SQL Editor) para empezar a recibir postulaciones.
        </p>
      )}
      <div className="mt-8">
        <PostulantesManager postulantes={postulantes} puedeEliminar={!actual || actual.rol === "administrador"} />
      </div>
    </div>
  );
}
