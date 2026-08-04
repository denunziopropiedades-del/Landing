import ContenidoManager from "@/components/admin/ContenidoManager";
import { getFinanciacionConfig, getPromocion, getSiteTextos } from "@/lib/content";

export default async function AdminContenidoPage() {
  const [promocion, financiacion, textos] = await Promise.all([
    getPromocion(),
    getFinanciacionConfig(),
    getSiteTextos(),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Contenido del sitio</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Editá la promoción, la financiación y los textos principales de la web.
      </p>
      <div className="mt-8">
        <ContenidoManager promocion={promocion} financiacion={financiacion} textos={textos} />
      </div>
    </div>
  );
}
