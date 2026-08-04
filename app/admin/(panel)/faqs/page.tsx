import FaqsManager from "@/components/admin/FaqsManager";
import { getFaqsAdmin, getProyectosAdmin } from "@/lib/admin/data";

export default async function AdminFaqsPage() {
  const [faqs, proyectos] = await Promise.all([getFaqsAdmin(), getProyectosAdmin()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Preguntas frecuentes</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Administrá las FAQs globales o específicas de cada proyecto.
      </p>
      <div className="mt-8">
        <FaqsManager proyectos={proyectos} faqs={faqs} />
      </div>
    </div>
  );
}
