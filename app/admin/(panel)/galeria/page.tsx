import GaleriaManager from "@/components/admin/GaleriaManager";
import { getGaleriaAdmin } from "@/lib/admin/data";

export default async function AdminGaleriaPage() {
  const items = await getGaleriaAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Galería</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Subí fotos, videos, tomas de drone, el plano del barrio y el masterplan.
      </p>
      <div className="mt-8">
        <GaleriaManager items={items} />
      </div>
    </div>
  );
}
