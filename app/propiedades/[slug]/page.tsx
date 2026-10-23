import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, Check, Droplets, MapPin, Maximize2, MessageCircle, Ruler, Wheat, Zap } from "lucide-react";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ConsultaForm from "@/components/propiedades/ConsultaForm";
import { getSiteTextos } from "@/lib/content";
import { esRural, formatearPrecio, getPropiedadBySlug, labelBarrio, labelSituacion, labelTipo, SITUACIONES, ubicacionTexto } from "@/lib/propiedades";
import { getPartido } from "@/lib/zonas";
import { esHtml, sanitizarHtml } from "@/lib/texto-enriquecido";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export const revalidate = 60;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await getPropiedadBySlug((await params).slug);
  if (!p) return {};
  const descripcion = `${labelTipo(p.tipo)} en ${p.operacion === "venta" ? "venta" : "alquiler"} en ${ubicacionTexto(p)}. ${formatearPrecio(p)}.`;
  return {
    title: p.titulo,
    description: descripcion,
    alternates: { canonical: `/propiedades/${p.slug}` },
    openGraph: { title: p.titulo, description: descripcion, images: p.fotos[0] ? [p.fotos[0]] : undefined },
  };
}

export default async function PropiedadPage({ params }: { params: Promise<Params> }) {
  const [{ slug }, textos] = await Promise.all([params, getSiteTextos()]);
  const p = await getPropiedadBySlug(slug);
  if (!p) notFound();

  const rural = esRural(p.tipo);
  const partido = getPartido(p.partido);
  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
  const base = rural ? "/campos" : p.operacion === "venta" ? "/comprar" : "/alquilar";
  const mensajeWa = `Hola! Me interesa "${p.titulo}" (${ubicacionTexto(p)}). ¿Me pasan más info?`;

  const datos: { icono: React.ReactNode; label: string; valor: string }[] = [];
  const add = (icono: React.ReactNode, label: string, v: number | string | null | undefined, suf = "") => {
    if (v !== null && v !== undefined && v !== "") datos.push({ icono, label, valor: `${typeof v === "number" ? fmt(v) : v}${suf}` });
  };
  if (rural) {
    add(<Ruler className="h-5 w-5" />, "Superficie", p.hectareas, " ha");
    add(<Wheat className="h-5 w-5" />, "Aptitud", p.aptitud);
    add(<Droplets className="h-5 w-5" />, "Agua", p.agua);
    if (p.luz !== null) add(<Zap className="h-5 w-5" />, "Luz", p.luz ? "Sí" : "No");
  } else {
    add(<BedDouble className="h-5 w-5" />, "Ambientes", p.ambientes);
    add(<BedDouble className="h-5 w-5" />, "Dormitorios", p.dormitorios);
    add(<Bath className="h-5 w-5" />, "Baños", p.banos);
    add(<Maximize2 className="h-5 w-5" />, "Sup. cubierta", p.supCubierta, " m²");
    add(<Ruler className="h-5 w-5" />, "Sup. total", p.supTotal, " m²");
    if (p.expensas) add(<Check className="h-5 w-5" />, "Expensas", `$ ${fmt(p.expensas)}`);
  }

  return (
    <PaginaPortal textos={textos}>
      <nav className="text-xs font-semibold text-brand-black/50">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>{" "}
        ›{" "}
        <Link href={base} className="hover:underline">
          {rural ? "Campos" : p.operacion === "venta" ? "Comprar" : "Alquilar"}
        </Link>
        {partido && (
          <>
            {" "}
            ›{" "}
            <Link href={`${base}?partido=${partido.slug}`} className="hover:underline">
              {partido.nombre}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Galeria fotos={p.fotos} titulo={p.titulo} />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-black px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {labelTipo(p.tipo)} · {p.operacion === "venta" ? "Venta" : rural ? "Arrendamiento" : "Alquiler"}
            </span>
            {p.situacion && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.situacion === "escritura" ? "bg-brand-green-700 text-white" : "bg-amber-500 text-brand-black"}`}>
                {labelSituacion(p.situacion)}
              </span>
            )}
            {p.barrio && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.barrio === "cerrado" ? "bg-brand-black text-brand-gold-500" : "bg-sky-600 text-white"}`}>
                {labelBarrio(p.barrio)}
              </span>
            )}
            {p.aptoCredito && <span className="rounded-full bg-[#2f5d8a] px-3 py-1 text-xs font-bold text-white">Apto crédito bancario</span>}
            {p.financiacionDirecta && <span className="rounded-full bg-brand-gold-500 px-3 py-1 text-xs font-bold text-brand-black">Financiación directa</span>}
            {p.etiquetas.map((e) => (
              <span key={e} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-brand-black/75">
                {e}
              </span>
            ))}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-brand-black sm:text-4xl">{p.titulo}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-brand-black/65">
            <MapPin className="h-4 w-4" />
            {[p.direccion && !/^https?:\/\//i.test(p.direccion) ? p.direccion : null, ubicacionTexto(p)].filter(Boolean).join(" · ")}
            {partido && <span className="text-brand-black/40">· Zona {partido.zona.nombre}</span>}
          </p>

          {datos.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {datos.map((d) => (
                <div key={d.label} className="flex items-center gap-3 rounded-2xl bg-white p-4">
                  <span className="text-brand-green-700">{d.icono}</span>
                  <span>
                    <span className="block text-xs text-brand-black/55">{d.label}</span>
                    <span className="block font-bold text-brand-black">{d.valor}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {(p.situacion || p.barrio || p.aptoCredito || p.financiacionDirecta) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {p.situacion && (
                <div className="rounded-2xl bg-white p-4">
                  <span className="block text-xs text-brand-black/55">Situación dominial</span>
                  <span className="block font-bold text-brand-black">{labelSituacion(p.situacion)}</span>
                  <span className="block text-xs text-brand-black/55">{SITUACIONES.find((s) => s.value === p.situacion)?.detalle}</span>
                </div>
              )}
              {p.barrio && (
                <div className="rounded-2xl bg-white p-4">
                  <span className="block text-xs text-brand-black/55">Tipo de barrio</span>
                  <span className="block font-bold text-brand-black">{labelBarrio(p.barrio)}</span>
                </div>
              )}
              {p.aptoCredito && (
                <div className="rounded-2xl bg-white p-4">
                  <span className="block text-xs text-brand-black/55">Forma de pago</span>
                  <span className="block font-bold text-brand-black">Apto crédito bancario</span>
                </div>
              )}
              {p.financiacionDirecta && (
                <div className="rounded-2xl bg-white p-4">
                  <span className="block text-xs text-brand-black/55">Forma de pago</span>
                  <span className="block font-bold text-brand-black">Financiación directa</span>
                  <span className="block text-xs text-brand-black/55">Consultá plan de cuotas</span>
                </div>
              )}
            </div>
          )}

          {p.descripcion && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold text-brand-black">Descripción</h2>
              {esHtml(p.descripcion) ? (
                <div
                  className="mt-2 leading-relaxed text-brand-black/80 [&_b]:font-bold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold [&_i]:italic [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_span]:rounded-sm [&_u]:underline [&_ul]:list-disc"
                  dangerouslySetInnerHTML={{ __html: sanitizarHtml(p.descripcion) }}
                />
              ) : (
                <p className="mt-2 whitespace-pre-line leading-relaxed text-brand-black/75">{p.descripcion}</p>
              )}
            </div>
          )}

          {(p.mapsUrl || (p.direccion && /^https?:\/\//i.test(p.direccion))) && (
            <a
              href={p.mapsUrl ?? p.direccion!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-brand-black hover:bg-black/5"
            >
              <MapPin className="h-4 w-4" />
              Ver ubicación en el mapa
            </a>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl bg-brand-black p-6 text-white">
            <p className="text-sm text-white/60">{p.operacion === "venta" ? "Precio" : rural ? "Arrendamiento" : "Alquiler"}</p>
            <p className="text-3xl font-extrabold">{formatearPrecio(p)}</p>
            {rural && p.hectareas && p.precio && p.precioUnidad === "ha" && p.operacion === "venta" && (
              <p className="mt-1 text-sm text-white/60">
                Total aprox.: {p.moneda} {fmt(p.precio * p.hectareas)}
              </p>
            )}
            <a
              href={buildWhatsappUrl(mensajeWa, textos.whatsappNumero)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#25D366] font-bold text-white"
            >
              <MessageCircle className="h-5 w-5" />
              Consultar por WhatsApp
            </a>
            <Link
              href={`/visitas?propiedad=${p.slug}`}
              className="mt-2 flex h-[52px] items-center justify-center rounded-full border border-white/25 font-semibold text-white hover:bg-white/10"
            >
              Coordinar una visita
            </Link>
          </div>
          <div className="mt-4 rounded-3xl bg-white p-5">
            <p className="mb-3 font-display text-lg font-bold text-brand-black">Dejanos tu consulta</p>
            <ConsultaForm modo="propiedad" propiedadId={p.id} mensajeInicial={`Me interesa esta propiedad: ${p.titulo}.`} />
          </div>
          <p className="mt-4 px-2 text-center text-[11px] uppercase tracking-wide text-brand-black/45">
            Inmobiliaria De Nunzio Negocios Inmobiliarios · Matías De Nunzio, Martillero Público
          </p>
        </aside>
      </div>
    </PaginaPortal>
  );
}

function Galeria({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-3xl bg-white text-sm text-brand-black/40">
        Fotos próximamente
      </div>
    );
  }
  const [principal, ...resto] = fotos;
  return (
    <div className="grid gap-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-white">
        <Image src={principal} alt={titulo} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
      </div>
      {resto.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {resto.slice(0, 8).map((f, i) => (
            <a key={f} href={f} target="_blank" rel="noopener noreferrer" className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
              <Image src={f} alt={`${titulo} — foto ${i + 2}`} fill sizes="15vw" className="object-cover transition hover:scale-105" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
