import { redirect } from "next/navigation";
import UsuariosManager from "@/components/admin/UsuariosManager";
import { getPerfiles } from "@/lib/admin/data";
import { getPerfilActual } from "@/lib/admin/auth";

export default async function AdminUsuariosPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol !== "administrador") redirect("/admin");

  const perfiles = await getPerfiles();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Usuarios y roles</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Invitá miembros del equipo y asignales rol de administrador, supervisor o vendedor.
      </p>
      <div className="mt-8">
        <UsuariosManager perfiles={perfiles} usuarioActualId={actual?.id ?? ""} />
      </div>
    </div>
  );
}
