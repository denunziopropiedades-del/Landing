import { redirect } from "next/navigation";

/** Link anterior (puede estar en anuncios o mensajes viejos): lleva a la agenda simplificada. */
export default async function VisitaOnlinePage({ searchParams }: { searchParams: Promise<{ proyecto?: string }> }) {
  const { proyecto } = await searchParams;
  redirect(proyecto ? `/visitas?proyecto=${encodeURIComponent(proyecto)}` : "/visitas");
}
