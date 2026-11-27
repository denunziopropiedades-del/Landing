// Feed XML en formato VRSync (estándar ZAP/VivaReal) con las propiedades publicadas en la web.
// Lo leen portales como TuLugar para sincronizar altas, bajas y precios automáticamente.
// URL pública: https://matulotes.app/api/feeds/vrsync
import { getPropiedades, type Propiedad, type TipoPropiedad } from "@/lib/propiedades";
import { getPartido } from "@/lib/zonas";

export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");
const EMAIL = "denunziopropiedades@gmail.com";
const TELEFONO = "+5491127424512";
const NOMBRE = "De Nunzio Negocios Inmobiliarios";

const CONTACTO_TEXTO = [
  "",
  "📲 Consultas por WhatsApp:",
  "11-2742-4512",
  "11-6136-5523",
  SITE_URL,
  "",
  "MATULOTES | De Nunzio Negocios Inmobiliarios",
  "Martillero Público y Corredor Inmobiliario · Mat. 7886",
].join("\n");

const TIPO_VRSYNC: Record<TipoPropiedad, string> = {
  casa: "Residential / Home",
  departamento: "Residential / Apartment",
  ph: "Residential / Apartment",
  local: "Commercial / Business",
  galpon: "Commercial / Industrial",
  terreno: "Residential / Land Lot",
  lote_comercial: "Commercial / Land Lot",
  campo: "Commercial / Agricultural",
  chacra: "Residential / Farm Ranch",
};

function xml(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textoPlano(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function superficieM2(p: Propiedad): number | null {
  if (p.supTotal) return p.supTotal;
  if (p.hectareas) return Math.round(p.hectareas * 10000);
  return null;
}

function listing(p: Propiedad): string | null {
  // Sin precio total no se puede publicar en los portales; queda solo en la web.
  if (!p.precio || p.precioUnidad !== "total") return null;
  const partido = getPartido(p.partido)?.nombre ?? p.partido;
  const url = `${SITE_URL}/propiedades/${p.slug}`;
  const descripcion = `${textoPlano(p.descripcion) || p.titulo}\n\nVer ficha completa: ${url}\n${CONTACTO_TEXTO}`;
  const m2 = superficieM2(p);
  const fotos = p.fotos
    .filter((f) => /^https?:\/\//.test(f))
    .map((f, i) => `<Item medium="image" caption="${xml(p.titulo)}"${i === 0 ? ' primary="true"' : ""}>${xml(f)}</Item>`)
    .join("");

  return `<Listing>
<ListingID>${xml(p.id)}</ListingID>
<Title>${xml(p.titulo)}</Title>
<TransactionType>${p.operacion === "alquiler" ? "For Rent" : "For Sale"}</TransactionType>
<PublicationType>STANDARD</PublicationType>
<DetailViewUrl>${xml(url)}</DetailViewUrl>
<Media>${fotos}</Media>
<Details>
<PropertyType>${TIPO_VRSYNC[p.tipo] ?? "Residential / Land Lot"}</PropertyType>
<Description><![CDATA[${descripcion.replace(/]]>/g, "]]]]><![CDATA[>")}]]></Description>
${p.operacion === "alquiler" ? `<RentalPrice currency="${p.moneda}" period="Monthly">${p.precio}</RentalPrice>` : `<ListPrice currency="${p.moneda}">${p.precio}</ListPrice>`}
${m2 ? `<LotArea unit="square metres">${m2}</LotArea>` : ""}
${p.supCubierta ? `<LivingArea unit="square metres">${p.supCubierta}</LivingArea>` : ""}
${p.dormitorios ? `<Bedrooms>${p.dormitorios}</Bedrooms>` : ""}
${p.banos ? `<Bathrooms>${p.banos}</Bathrooms>` : ""}
</Details>
<Location displayAddress="Neighborhood">
<Country abbreviation="AR">Argentina</Country>
<State abbreviation="B">Buenos Aires</State>
<City>${xml(partido)}</City>
<Neighborhood>${xml(p.localidad ?? partido)}</Neighborhood>
</Location>
<ContactInfo>
<Name>${xml(NOMBRE)}</Name>
<Email>${EMAIL}</Email>
<Website>${SITE_URL}</Website>
<Telephone>${TELEFONO}</Telephone>
</ContactInfo>
</Listing>`;
}

export async function GET() {
  const propiedades = (await getPropiedades()).filter((p) => !p.vendido);
  const listings = propiedades.map(listing).filter(Boolean).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<Header>
<Provider>${xml(NOMBRE)}</Provider>
<Email>${EMAIL}</Email>
<ContactName>Matías De Nunzio</ContactName>
<PublishDate>${new Date().toISOString()}</PublishDate>
<Telephone>${TELEFONO}</Telephone>
</Header>
<Listings>
${listings}
</Listings>
</ListingDataFeed>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
