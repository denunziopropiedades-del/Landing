import Link from "next/link";
import { ChevronRight, MessageCircle, SearchX } from "lucide-react";
import PropiedadCard from "@/components/propiedades/PropiedadCard";
import {
  getPropiedades,
  TIPOS,
  TIPOS_RURALES,
  type Operacion,
  type TipoPropiedad,
} from "@/lib/propiedades";
import { getPartido, getZona, ZONAS } from "@/lib/zonas";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export type ModoListado = "comprar" | "alquilar" | "campos" | "zona";
export type ParamsListado = {
  zona?: string;
  partido?: string;
  tipo?: string;
  operacion?: string;
  amb?: string;
  ha?: string;
};

const TIPOS_URBANOS = TIPOS.filter((t) => !TIPOS_RURALES.includes(t.value));
const TIPOS_CAMPO = TIPOS.filter((t) => TIPOS_RURALES.includes(t.value));

/** Listado de propiedades con filtros por zona, partido, tipo y operación (todo por URL, sin JS). */
export default async function ListadoPropiedades({
  modo,
  basePath,
  params,
  zonaFija,
  numeroWhatsapp,
}: {
  modo: ModoListado;
  basePath: string;
  params: ParamsListado;
  /** En /zonas/[zona] la zona viene de la URL y no se muestra el filtro de zonas. */
  zonaFija?: string;
  numeroWhatsapp?: string;
}) {
  const partido = getPartido(params.partido);
  const zona = getZona(zonaFija ?? params.zona) ?? partido?.zona;
  const rural = modo === "campos";

  const operacion: Operacion | undefined =
    modo === "comprar" ? "venta" : modo === "alquilar" ? "alquiler" : params.operacion === "venta" || params.operacion === "alquiler" ? params.operacion : undefined;

  const tiposPosibles = rural ? TIPOS_CAMPO : modo === "zona" ? TIPOS : TIPOS_URBANOS;
  const tipoElegido = tiposPosibles.find((t) => t.value === params.tipo)?.value as TipoPropiedad | undefined;
  const tipos: TipoPropiedad[] = tipoElegido ? [tipoElegido] : tiposPosibles.map((t) => t.value);
  const ambientesMin = !rural && params.amb ? Number(params.amb) || undefined : undefined;
  const hectareasMin = rural && params.ha ? Number(params.ha) || undefined : undefined;

  const propiedades = await getPropiedades({
    operacion,
    tipos,
    zona: zona?.slug,
    partido: partido?.slug,
    ambientesMin,
    hectareasMin,
  });

  /** Arma el link de un filtro conservando el resto. */
  const href = (cambios: Partial<ParamsListado>) => {
    const sp = new URLSearchParams();
    const final: ParamsListado = { ...params, ...cambios };
    if (zonaFija) delete final.zona;
    for (const [k, v] of Object.entries(final)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const lugar = partido?.nombre ?? zona?.nombre;
  const sujeto = rural
    ? tipoElegido === "chacra"
      ? "Chacras"
      : "Campos"
    : tipoElegido
      ? TIPOS.find((t) => t.value === tipoElegido)!.plural
      : "Propiedades";
  const verbo =
    operacion === "venta" ? (rural ? " en venta" : " en venta") : operacion === "alquiler" ? (rural ? " en arrendamiento" : " en alquiler") : rural ? " en venta y arrendamiento" : "";
  const titulo = `${sujeto}${verbo}${lugar ? ` en ${lugar}` : ""}`;

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
      on ? "border-brand-black bg-brand-black text-white" : "border-black/10 bg-white text-brand-black/80 hover:border-brand-black/40"
    }`;

  return (
    <div>
      <nav className="text-xs font-semibold text-brand-black/50">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>{" "}
        ›{" "}
        <Link href={basePath} className="hover:underline">
          {modo === "comprar" ? "Comprar" : modo === "alquilar" ? "Alquilar" : modo === "campos" ? "Campos" : "Zonas"}
        </Link>
        {zona && !zonaFija && <> › {zona.nombre}</>}
        {partido && <> › {partido.nombre}</>}
      </nav>
      <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-4xl">{titulo}</h1>
      <p className="mt-1.5 text-sm text-brand-black/60">
        {propiedades.length > 0 ? `${propiedades.length} resultado${propiedades.length > 1 ? "s" : ""}` : "Sin resultados por ahora"}
        {zona && ` · ${zona.partidos.map((p) => p.nombre).join(", ")}`}
      </p>

      <div className="mt-6 space-y-2.5">
        {modo !== "comprar" && modo !== "alquilar" && (
          <Fila>
            <Link href={href({ operacion: undefined })} className={chip(!operacion)}>
              {rural ? "Venta y arriendo" : "Venta y alquiler"}
            </Link>
            <Link href={href({ operacion: "venta" })} className={chip(operacion === "venta")}>
              En venta
            </Link>
            <Link href={href({ operacion: "alquiler" })} className={chip(operacion === "alquiler")}>
              {rural ? "Arrendamiento" : "En alquiler"}
            </Link>
          </Fila>
        )}

        {!zonaFija && (
          <Fila>
            <Link href={href({ zona: undefined, partido: undefined })} className={chip(!zona)}>
              Todas las zonas
            </Link>
            {ZONAS.map((z) => (
              <Link key={z.slug} href={href({ zona: z.slug, partido: undefined })} className={chip(zona?.slug === z.slug && !partido)}>
                {z.nombre}
              </Link>
            ))}
          </Fila>
        )}

        {zona && (
          <Fila>
            <Link href={href({ partido: undefined, zona: zona.slug })} className={chip(!partido)}>
              Todos los partidos
            </Link>
            {zona.partidos.map((p) => (
              <Link key={p.slug} href={href({ partido: p.slug, zona: zona.slug })} className={chip(partido?.slug === p.slug)}>
                {p.nombre}
              </Link>
            ))}
          </Fila>
        )}

        <Fila>
          <Link href={href({ tipo: undefined })} className={chip(!tipoElegido)}>
            {rural ? "Campos y chacras" : "Todos los tipos"}
          </Link>
          {tiposPosibles.map((t) => (
            <Link key={t.value} href={href({ tipo: t.value })} className={chip(tipoElegido === t.value)}>
              {t.label}
            </Link>
          ))}
          {rural
            ? ["10", "50", "100", "500"].map((h) => (
                <Link key={h} href={href({ ha: params.ha === h ? undefined : h })} className={chip(params.ha === h)}>
                  {h}+ ha
                </Link>
              ))
            : ["2", "3", "4"].map((a) => (
                <Link key={a} href={href({ amb: params.amb === a ? undefined : a })} className={chip(params.amb === a)}>
                  {a}+ amb.
                </Link>
              ))}
        </Fila>
      </div>

      {propiedades.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {propiedades.map((p) => (
            <PropiedadCard key={p.id} propiedad={p} />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-black/15 bg-white px-6 py-12 text-center">
          <SearchX className="h-10 w-10 text-brand-black/30" />
          <p className="mt-3 font-display text-xl font-bold text-brand-black">Estamos sumando propiedades {lugar ? `en ${lugar}` : "en esta búsqueda"}</p>
          <p className="mt-1.5 max-w-md text-sm text-brand-black/65">
            Contanos qué estás buscando y te avisamos apenas tengamos algo que encaje. Muchas propiedades las ofrecemos antes de publicarlas.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={buildWhatsappUrl(`Hola! Estoy buscando ${titulo.charAt(0).toLowerCase()}${titulo.slice(1)}. ¿Me avisan si tienen algo?`, numeroWhatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Avisame por WhatsApp
            </a>
            <Link
              href="/tasaciones"
              className="inline-flex items-center justify-center gap-1 rounded-full border border-black/15 px-6 py-3 text-sm font-semibold text-brand-black hover:bg-black/5"
            >
              ¿Querés vender o alquilar la tuya?
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Fila({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">{children}</div>;
}
