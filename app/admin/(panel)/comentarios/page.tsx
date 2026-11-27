import { redirect } from "next/navigation";
import ComentariosManager from "@/components/admin/ComentariosManager";
import { getPerfilActual } from "@/lib/admin/auth";
import { getComentarios } from "@/lib/admin/comentarios-actions";

export const dynamic = "force-dynamic";

export default async function AdminComentariosPage() {
  const actual = await getPerfilActual();
  if (actual?.rol === "revisor") redirect("/admin/mensajes");
  const { comentarios, faltaTabla } = await getComentarios();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Comentarios</h1>
      <p className="mt-1 mb-5 text-sm text-brand-black/60">
        Comentarios de tus publicaciones de Facebook e Instagram. Respondé en público o por privado (le llega por Messenger o Instagram Direct).
      </p>
      {faltaTabla && <p className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">Falta correr sql-comentarios.sql en Supabase.</p>}
      <ComentariosManager iniciales={comentarios} />
    </div>
  );
}
