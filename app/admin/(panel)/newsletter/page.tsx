import { redirect } from "next/navigation";
import NewsletterManager, { type DestinoNewsletter } from "@/components/admin/NewsletterManager";
import { getPerfilActual } from "@/lib/admin/auth";
import { getProyectosAdmin } from "@/lib/admin/data";
import { getEnviosNewsletter } from "@/lib/admin/newsletter-actions";
import { getPropiedadesAdmin } from "@/lib/admin/propiedades-actions";

// El envío a todos se hace en esta misma acción: le damos tiempo de sobra.
export const maxDuration = 300;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

export default async function AdminNewsletterPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");

  const [proyectos, { propiedades }, envios] = await Promise.all([
    getProyectosAdmin(),
    getPropiedadesAdmin(),
    getEnviosNewsletter(),
  ]);

  const destinos: DestinoNewsletter[] = [
    { grupo: "Páginas", label: "Inicio", url: `${SITE_URL}/` },
    { grupo: "Páginas", label: "Comprar", url: `${SITE_URL}/comprar` },
    { grupo: "Páginas", label: "Desarrollos", url: `${SITE_URL}/desarrollos` },
    { grupo: "Páginas", label: "Agendar visita", url: `${SITE_URL}/visitas` },
    ...proyectos
      .filter((p) => p.publicado)
      .map((p) => ({ grupo: "Desarrollos", label: p.nombre, url: `${SITE_URL}/desarrollos/${p.slug}` })),
    ...propiedades
      .filter((p) => p.publicado)
      .map((p) => ({ grupo: "Propiedades", label: p.titulo, url: `${SITE_URL}/propiedades/${p.slug}` })),
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Newsletter</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Mandá promociones por email a quienes agendaron una visita y todavía no compraron.
      </p>
      <div className="mt-8">
        <NewsletterManager destinos={destinos} envios={envios} siteUrl={SITE_URL} />
      </div>
    </div>
  );
}
