import Link from "next/link";
import { XCircle } from "lucide-react";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export default function ReservaErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-black px-4 text-center">
      <XCircle className="h-16 w-16 text-red-500" />
      <h1 className="mt-6 font-display text-3xl font-bold text-white">No pudimos procesar el pago</h1>
      <p className="mt-3 max-w-md text-white/70">
        Tu pago no se pudo completar. Podés intentarlo nuevamente o coordinar la seña directamente con nuestro equipo.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="rounded-full border border-white/30 px-6 py-3 font-semibold text-white">
          Volver al inicio
        </Link>
        <a href={buildWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="rounded-full bg-brand-gold-500 px-6 py-3 font-semibold text-brand-black">
          Hablar por WhatsApp
        </a>
      </div>
    </main>
  );
}
