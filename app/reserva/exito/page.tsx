import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function ReservaExitoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-black px-4 text-center">
      <CheckCircle2 className="h-16 w-16 text-brand-green-500" />
      <h1 className="mt-6 font-display text-3xl font-bold text-white">¡Pago de seña acreditado!</h1>
      <p className="mt-3 max-w-md text-white/70">
        Recibimos tu pago correctamente. Nuestro equipo comercial se pondrá en contacto para confirmar los próximos pasos de tu reserva.
      </p>
      <Link href="/" className="mt-8 rounded-full bg-brand-gold-500 px-6 py-3 font-semibold text-brand-black">
        Volver al inicio
      </Link>
    </main>
  );
}
