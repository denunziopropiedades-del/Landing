import Link from "next/link";
import { Clock } from "lucide-react";

export default function ReservaPendientePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-black px-4 text-center">
      <Clock className="h-16 w-16 text-brand-gold-400" />
      <h1 className="mt-6 font-display text-3xl font-bold text-white">Pago pendiente</h1>
      <p className="mt-3 max-w-md text-white/70">
        Tu pago está siendo procesado. Te avisaremos por email en cuanto se acredite la seña.
      </p>
      <Link href="/" className="mt-8 rounded-full bg-brand-gold-500 px-6 py-3 font-semibold text-brand-black">
        Volver al inicio
      </Link>
    </main>
  );
}
