import { getPerfilActual } from "@/lib/admin/auth";

/** El panel (admin/supervisor) puede ver todo; el inquilino o propietario, solo con su link (token). */
export async function esStaffAlquileres(): Promise<boolean> {
  const perfil = await getPerfilActual();
  return Boolean(perfil && ["administrador", "supervisor"].includes(perfil.rol));
}
