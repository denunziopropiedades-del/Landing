// TEMPORAL: prueba de geocodificación (se borra después).
import { getProyectos } from "@/lib/content";
import { getPropiedades } from "@/lib/propiedades";

export const dynamic = "force-dynamic";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

async function traza(url: string) {
  const pasos: { url: string; status?: number; location?: string | null; coords?: string[]; error?: string }[] = [];
  let actual = url;
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(actual, { redirect: "manual", headers: { "User-Agent": UA, "Accept-Language": "es-AR,es" }, cache: "no-store" });
      const loc = r.headers.get("location");
      const paso: (typeof pasos)[number] = { url: actual.slice(0, 400), status: r.status, location: loc?.slice(0, 600) ?? null };
      if (!loc) {
        const t = await r.text();
        paso.coords = [...t.matchAll(/-3[45]\.\d{4,}[^-\d]{1,12}-5[789]\.\d{4,}/g)].slice(0, 12).map((m) => m[0]);
        const k = t.indexOf("APP_INITIALIZATION_STATE");
        if (k >= 0) paso.coords.push("INIT:" + t.slice(k, k + 300));
        pasos.push(paso);
        break;
      }
      pasos.push(paso);
      actual = new URL(loc, actual).toString();
    } catch (e) {
      pasos.push({ url: actual, error: String(e) });
      break;
    }
  }
  return pasos;
}

export async function GET() {
  const [proyectos, propiedades] = await Promise.all([getProyectos(), getPropiedades()]);
  const out = [];
  for (const p of proyectos) out.push({ nombre: p.nombre, ubicacion: p.ubicacion, link: p.ubicacionMapsUrl, traza: p.ubicacionMapsUrl ? await traza(p.ubicacionMapsUrl) : null });
  for (const p of propiedades) out.push({ nombre: p.titulo, direccion: p.direccion, localidad: p.localidad, link: p.mapsUrl, traza: p.mapsUrl ? await traza(p.mapsUrl) : null });
  out.push({ nombre: "embed Arroyos", traza: await traza("https://maps.google.com/maps?q=ARROYOS%20DE%20SAN%20VICENTE&t=k&z=13&ie=UTF8&iwloc=&output=embed") });
  return Response.json(out);
}
