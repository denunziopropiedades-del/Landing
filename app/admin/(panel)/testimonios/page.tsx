import TestimoniosManager from "@/components/admin/TestimoniosManager";
import { getTestimoniosAdmin } from "@/lib/admin/data";

export default async function AdminTestimoniosPage() {
  const testimonios = await getTestimoniosAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Testimonios</h1>
      <p className="mt-1 text-sm text-brand-black/60">Gestioná las opiniones de clientes que se muestran en la web.</p>
      <div className="mt-8">
        <TestimoniosManager testimonios={testimonios} />
      </div>
    </div>
  );
}
