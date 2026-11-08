import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ListadoPropiedades, { type ParamsListado } from "@/components/propiedades/ListadoPropiedades";
import { getSiteTextos } from "@/lib/content";
import { PARTIDOS, getPartido } from "@/lib/zonas";
import { INFO_LOCAL, descripcionLocal, faqsLocales, tituloLocal } from "@/lib/seo-local";

type Params = { partido: string };

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

export const revalidate = 3600;

export function generateStaticParams() {
  return PARTIDOS.map((p) => ({ partido: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = getPartido((await params).partido);
  const info = p && INFO_LOCAL[p.slug];
  if (!p || !info) return {};
  return {
    title: tituloLocal(p.nombre, info),
    description: descripcionLocal(p.nombre, info),
    alternates: { canonical: `/inmobiliaria/${p.slug}` },
    openGraph: { title: tituloLocal(p.nombre, info), description: descripcionLocal(p.nombre, info) },
  };
}

export default async function InmobiliariaLocalPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<ParamsListado>;
}) {
  const [{ partido: slug }, sp, textos] = await Promise.all([params, searchParams, getSiteTextos()]);
  const p = getPartido(slug);
  const info = p && INFO_LOCAL[p.slug];
  if (!p || !info) notFound();
  const faqs = faqsLocales(p.nombre);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: `De Nunzio Negocios Inmobiliarios – ${p.nombre}`,
      url: `${SITE_URL}/inmobiliaria/${p.slug}`,
      telephone: "+54 9 11 2742-4512",
      areaServed: info.localidades.map((l) => ({ "@type": "City", name: l })),
      address: { "@type": "PostalAddress", addressLocality: p.nombre, addressRegion: "Buenos Aires", addressCountry: "AR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.pregunta, acceptedAnswer: { "@type": "Answer", text: f.respuesta } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: p.zona.nombre, item: `${SITE_URL}/zonas/${p.zona.slug}` },
        { "@type": "ListItem", position: 3, name: `Inmobiliaria en ${p.nombre}`, item: `${SITE_URL}/inmobiliaria/${p.slug}` },
      ],
    },
  ];

  const otros = PARTIDOS.filter((x) => x.zona.slug === p.zona.slug && x.slug !== p.slug);

  return (
    <PaginaPortal textos={textos}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-3 text-xs text-brand-black/50">
        <Link href="/">Inicio</Link> › <Link href={`/zonas/${p.zona.slug}`}>{p.zona.nombre}</Link> › {p.nombre}
      </nav>
      <h1 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Inmobiliaria en {p.nombre}</h1>
      <p className="mt-2 text-sm font-semibold text-brand-black/60">{info.localidades.join(" · ")}</p>
      <p className="mt-4 max-w-3xl text-brand-black/80">{info.intro}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href={`/alquilar?partido=${p.slug}`} className="rounded-2xl bg-white p-4 shadow-sm hover:shadow">
          <p className="font-bold text-brand-black">Alquileres en {p.nombre}</p>
          <p className="text-sm text-brand-black/60">Casas y departamentos en alquiler.</p>
        </Link>
        <Link href={`/comprar?partido=${p.slug}`} className="rounded-2xl bg-white p-4 shadow-sm hover:shadow">
          <p className="font-bold text-brand-black">Comprar en {p.nombre}</p>
          <p className="text-sm text-brand-black/60">Casas, terrenos y lotes en venta.</p>
        </Link>
        <Link href={`/campos?partido=${p.slug}`} className="rounded-2xl bg-white p-4 shadow-sm hover:shadow">
          <p className="font-bold text-brand-black">Campos en {p.nombre}</p>
          <p className="text-sm text-brand-black/60">Campos y chacras en venta y arrendamiento.</p>
        </Link>
      </div>

      <h2 className="mt-10 font-display text-2xl font-bold text-brand-black">Propiedades en {p.nombre}</h2>
      <div className="mt-4">
        <ListadoPropiedades
          modo="zona"
          basePath={`/inmobiliaria/${p.slug}`}
          params={{ ...sp, partido: sp.partido ?? p.slug }}
          zonaFija={p.zona.slug}
          numeroWhatsapp={textos.whatsappNumero}
        />
      </div>

      <section className="mt-12 rounded-2xl bg-brand-black p-6 text-white sm:p-8">
        <h2 className="font-display text-2xl font-bold">¿Querés alquilar o vender tu propiedad en {p.nombre}?</h2>
        <p className="mt-2 max-w-2xl text-white/80">
          Tasación sin cargo, publicación, selección de inquilinos, contratos, cobro mensual y liquidación al propietario. Atención de un
          Martillero Público colegiado (Matrícula COL 7886).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/propietarios" className="rounded-full bg-brand-gold-500 px-5 py-2.5 font-semibold text-brand-black">
            Quiero alquilar o vender mi propiedad
          </Link>
          <Link href="/tasaciones" className="rounded-full border border-white/40 px-5 py-2.5 font-semibold">
            Pedir tasación
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-brand-black">Preguntas frecuentes</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((f) => (
            <details key={f.pregunta} className="rounded-2xl bg-white p-4 shadow-sm">
              <summary className="cursor-pointer font-semibold text-brand-black">{f.pregunta}</summary>
              <p className="mt-2 text-sm text-brand-black/70">{f.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      {otros.length > 0 && (
        <section className="mt-10 text-sm">
          <p className="font-semibold text-brand-black">También trabajamos en:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {otros.map((o) => (
              <Link key={o.slug} href={`/inmobiliaria/${o.slug}`} className="rounded-full bg-white px-3 py-1 text-brand-black/70 shadow-sm">
                Inmobiliaria en {o.nombre}
              </Link>
            ))}
          </div>
        </section>
      )}
    </PaginaPortal>
  );
}
