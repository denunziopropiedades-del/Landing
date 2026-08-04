import LotesManager from "@/components/admin/LotesManager";
import { getLotesAdmin } from "@/lib/admin/data";

export default async function AdminLotesPage() {
  const lotes = await getLotesAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Lotes y precios</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Administrá las tipologías de lotes, sus precios y disponibilidad.
      </p>
      <div className="mt-8">
        <LotesManager lotes={lotes} />
      </div>
    </div>
  );
}
