// TEMPORAL: prueba de geocodificación (se borra después).
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "ARROYOS DE SAN VICENTE";
  const out: Record<string, unknown> = { q };
  try {
    const r = await fetch(`https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=k&z=13&ie=UTF8&iwloc=&output=embed`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36", "Accept-Language": "es-AR,es" },
      cache: "no-store",
    });
    const t = await r.text();
    out.googleStatus = r.status;
    out.googleLen = t.length;
    out.googleCoords = [...t.matchAll(/-3[45]\.\d{3,}[^-]{0,40}-5[789]\.\d{3,}/g)].slice(0, 15).map((m) => m[0]);
    const i = t.indexOf("initEmbed");
    out.googleInit = i >= 0 ? t.slice(i, i + 1500) : t.slice(0, 600);
  } catch (e) {
    out.googleError = String(e);
  }
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=ar&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "MatuLotes/1.0 (denunziopropiedades@gmail.com)" },
      cache: "no-store",
    });
    out.nominatim = await r.json();
  } catch (e) {
    out.nominatimError = String(e);
  }
  return Response.json(out);
}
