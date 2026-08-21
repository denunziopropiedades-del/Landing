import type { Metadata } from "next";
import Link from "next/link";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Política de privacidad",
  robots: { index: true, follow: true },
};

export default async function PoliticaDePrivacidadPage() {
  const textos = await getSiteTextos();

  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm font-semibold text-brand-green-700 underline">
        ← Volver al inicio
      </Link>

      <h1 className="mt-6 font-display text-3xl font-bold text-brand-black sm:text-4xl">Política de privacidad</h1>
      <p className="mt-2 text-sm text-brand-black/50">Última actualización: agosto de 2026.</p>

      <div className="mt-10 space-y-8 text-brand-black/80">
        <section>
          <h2 className="font-display text-xl font-bold text-brand-black">Responsable</h2>
          <p className="mt-2">
            Este sitio es operado por <strong>De Nunzio Negocios Inmobiliarios</strong> (Matías De Nunzio,
            Desarrollos Urbanos), en adelante &ldquo;Matu Lotes&rdquo;. Ante cualquier consulta sobre esta política o tus datos personales,
            podés escribirnos a <strong>{textos.email}</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-black">Qué datos recopilamos</h2>
          <p className="mt-2">
            Cuando completás alguno de nuestros formularios (contacto, reserva de un lote, agenda de visita, o un
            formulario de anuncios de Meta/Facebook e Instagram) recopilamos los datos que nos proporcionás
            voluntariamente: nombre, apellido, DNI (solo para reservas), email, teléfono, y el desarrollo o lote de tu
            interés.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-black">Para qué usamos tus datos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Responder tus consultas y coordinar visitas por email o WhatsApp.</li>
            <li>Gestionar reservas y el proceso de compra de un lote.</li>
            <li>Enviarte comunicaciones puntuales relacionadas a tu vínculo comercial con nosotros (por ejemplo, un
              saludo en fechas especiales, una vez que ya sos cliente).</li>
            <li>Mejorar nuestras campañas de publicidad (Meta Ads, Google Ads) y medir su efectividad.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-black">Con quién compartimos tus datos</h2>
          <p className="mt-2">
            No vendemos ni cedemos tus datos a terceros. Utilizamos proveedores de servicios para operar el sitio
            (alojamiento, base de datos, envío de emails, calendario, y análisis de campañas publicitarias), que
            procesan la información únicamente para prestarnos ese servicio.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-black">Tus derechos</h2>
          <p className="mt-2">
            Podés solicitarnos en cualquier momento el acceso, la corrección o la eliminación de tus datos personales,
            escribiéndonos a <strong>{textos.email}</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-black">Cookies y analítica</h2>
          <p className="mt-2">
            Podemos usar cookies y herramientas de analítica (como Google Analytics o Meta Pixel) para entender cómo
            se usa el sitio y medir el rendimiento de nuestras campañas publicitarias.
          </p>
        </section>
      </div>
    </main>
  );
}
