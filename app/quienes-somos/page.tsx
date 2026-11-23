import type { Metadata } from "next";
import Image from "next/image";
import { HeartHandshake, MessageCircle, Scale, ShieldCheck } from "lucide-react";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import { getSiteTextos } from "@/lib/content";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Matías De Nunzio, Martillero y Corredor Público (Mat. 7886). Desarrollos urbanos y soluciones inmobiliarias en Zona Sur con ética, transparencia y calidad humana.",
  alternates: { canonical: "/quienes-somos" },
};

const VALORES = [
  {
    icono: ShieldCheck,
    titulo: "Ética",
    texto: "Te decimos la verdad, aunque no sea lo que querés escuchar. La confianza se construye con transparencia.",
  },
  {
    icono: HeartHandshake,
    titulo: "Calidad humana",
    texto: "Escuchamos antes de ofrecer. Primero entendemos qué necesitás y después buscamos la solución.",
  },
  {
    icono: Scale,
    titulo: "Profesionalismo",
    texto: "Cada paso tiene respaldo técnico, legal y documental, desde la tasación hasta la escritura.",
  },
];

export default async function QuienesSomosPage() {
  const textos = await getSiteTextos();

  return (
    <PaginaPortal textos={textos}>
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <Image
              src="/matias-de-nunzio.jpg"
              alt="Matías De Nunzio, Martillero y Corredor Público, en su oficina"
              width={900}
              height={1598}
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="h-auto w-full"
            />
          </div>
          <p className="mt-4 text-center text-sm font-semibold text-brand-black/70">
            Matías De Nunzio · Martillero y Corredor Público · Mat. 7886
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Quiénes somos</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-5xl">
            Detrás de cada lote hay un sueño. Nosotros estamos para acompañarlo.
          </h1>

          <div className="mt-6 space-y-4 text-lg leading-relaxed text-brand-black/75">
            <p>
              Soy <strong className="text-brand-black">Matías De Nunzio</strong>, Martillero y Corredor Público (Mat. 7886) y
              Técnico Universitario en Martillero Público y Corredor por la Universidad Argentina John F. Kennedy.
            </p>
            <p>
              Hace años que trabajo en <strong className="text-brand-black">desarrollos urbanos en Zona Sur</strong>. Acompaño
              a familias, inversores y propietarios en una de las decisiones más importantes de su vida: elegir el lugar
              donde empieza su proyecto.
            </p>
            <p>
              Aprendí que una operación inmobiliaria no se trata solo de metros, precios y escrituras. Se trata de{" "}
              <strong className="text-brand-black">personas</strong>. De la pareja que junta su primer ahorro para tener
              algo propio. Del inversor que busca seguridad. De la familia que vende para empezar otra etapa. Cada caso es
              único, y lo atendemos de esa manera.
            </p>
          </div>

          <h2 className="mt-10 font-display text-2xl font-bold text-brand-black">
            Nuestro eje: valores, ética y profesionalismo
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {VALORES.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-700/10 text-brand-green-700">
                  <Icono className="h-5 w-5" />
                </span>
                <p className="mt-3 font-bold text-brand-black">{titulo}</p>
                <p className="mt-1 text-sm text-brand-black/65">{texto}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-10 font-display text-2xl font-bold text-brand-black">Hacia dónde vamos</h2>
          <p className="mt-3 text-lg leading-relaxed text-brand-black/75">
            Queremos ser <strong className="text-brand-black">una de las inmobiliarias más prestigiosas de Zona Sur</strong>.
            No por la cantidad de carteles, sino por la cantidad de personas que nos recomiendan. Nuestro compromiso es darte{" "}
            <strong className="text-brand-black">valor agregado y soluciones inmobiliarias reales</strong>: información
            clara, acompañamiento cercano y opciones que se ajustan a lo que podés y a lo que soñás.
          </p>

          <div className="mt-10 rounded-3xl bg-brand-black p-6 text-white sm:p-8">
            <p className="font-display text-2xl font-bold">¿Y vos? ¿Qué proyecto tenés en mente?</p>
            <p className="mt-3 text-white/75">
              Tal vez es tu primer terreno, una inversión o la venta de tu propiedad. Sea lo que sea, no tenés que hacerlo
              solo. Contanos tu idea y la convertimos en un plan.
            </p>
            <a
              href={buildWhatsappUrl("Hola Matías, vi la sección Quiénes somos y quiero contarte mi proyecto.", textos.whatsappNumero)}
              target="_blank"
              rel="noopener"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              <MessageCircle className="h-4 w-4" />
              Contanos tu proyecto
            </a>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
              De Nunzio Negocios Inmobiliarios
            </p>
            <p className="mt-1 font-display text-lg font-bold text-brand-gold-400">Tu lote. Tu proyecto. Construí hoy.</p>
          </div>
        </div>
      </div>
    </PaginaPortal>
  );
}
