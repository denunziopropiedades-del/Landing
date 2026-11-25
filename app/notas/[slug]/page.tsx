import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import { getSiteTextos } from "@/lib/content";
import { NOTAS, getNota } from "@/lib/notas";

type Params = { slug: string };

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

export function generateStaticParams() {
  return NOTAS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const nota = getNota((await params).slug);
  if (!nota) return {};
  return {
    title: nota.titulo,
    description: nota.descripcion,
    alternates: { canonical: `/notas/${nota.slug}` },
    openGraph: { type: "article", title: nota.titulo, description: nota.descripcion, publishedTime: nota.fecha },
  };
}

export default async function NotaPage({ params }: { params: Promise<Params> }) {
  const [{ slug }, textos] = await Promise.all([params, getSiteTextos()]);
  const nota = getNota(slug);
  if (!nota) notFound();

  const url = `${SITE_URL}/notas/${nota.slug}`;
  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: nota.titulo,
      description: nota.descripcion,
      datePublished: nota.fecha,
      dateModified: nota.fecha,
      mainEntityOfPage: url,
      author: { "@type": "Person", name: "Matías De Nunzio", jobTitle: "Martillero y Corredor Público (Mat. COL 7886)" },
      publisher: { "@type": "Organization", name: "De Nunzio Negocios Inmobiliarios", logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Notas", item: `${SITE_URL}/notas` },
        { "@type": "ListItem", position: 3, name: nota.titulo, item: url },
      ],
    },
  ];
  if (nota.faqs?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: nota.faqs.map((f) => ({ "@type": "Question", name: f.pregunta, acceptedAnswer: { "@type": "Answer", text: f.respuesta } })),
    });
  }

  const otras = NOTAS.filter((n) => n.slug !== nota.slug).slice(0, 3);

  return (
    <PaginaPortal textos={textos}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl">
        <nav className="mb-3 text-xs text-brand-black/50">
          <Link href="/">Inicio</Link> › <Link href="/notas">Notas</Link>
        </nav>
        <h1 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">{nota.titulo}</h1>
        <p className="mt-2 text-sm text-brand-black/55">Por Matías De Nunzio, Martillero y Corredor Público · Mat. COL 7886</p>
        <p className="mt-6 text-lg leading-relaxed text-brand-black/80">{nota.resumen}</p>

        {nota.secciones.map((s) => (
          <section key={s.titulo} className="mt-8">
            <h2 className="font-display text-2xl font-bold text-brand-black">{s.titulo}</h2>
            {s.parrafos.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-brand-black/75">
                {p}
              </p>
            ))}
            {s.lista && (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-brand-black/75">
                {s.lista.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {nota.faqs && nota.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold text-brand-black">Preguntas frecuentes</h2>
            <div className="mt-4 space-y-3">
              {nota.faqs.map((f) => (
                <details key={f.pregunta} className="rounded-2xl bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer font-semibold text-brand-black">{f.pregunta}</summary>
                  <p className="mt-2 text-sm text-brand-black/70">{f.respuesta}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 rounded-2xl bg-brand-black p-6 text-white">
          <p className="font-display text-xl font-bold">¿Tenés una consulta?</p>
          <p className="mt-1 text-white/80">Te asesoramos sin compromiso en San Vicente, Guernica, Presidente Perón y toda Zona Sur.</p>
          <Link href={nota.cta.href} className="mt-4 inline-block rounded-full bg-brand-gold-500 px-5 py-2.5 font-semibold text-brand-black">
            {nota.cta.texto}
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-brand-black">Otras notas</h2>
          <ul className="mt-3 space-y-2">
            {otras.map((n) => (
              <li key={n.slug}>
                <Link href={`/notas/${n.slug}`} className="font-semibold text-brand-green-700 hover:underline">
                  {n.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </PaginaPortal>
  );
}
