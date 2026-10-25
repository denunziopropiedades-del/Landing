"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Send, UploadCloud, Users } from "lucide-react";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary-client";
import {
  enviarNewsletterAction,
  enviarPruebaNewsletterAction,
  getAudienciaNewsletterAction,
  type EnvioNewsletter,
  type ResumenAudiencia,
} from "@/lib/admin/newsletter-actions";

export type DestinoNewsletter = { grupo: string; label: string; url: string };

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";
const OTRO = "__otro__";

export default function NewsletterManager({
  destinos,
  envios,
  siteUrl,
}: {
  destinos: DestinoNewsletter[];
  envios: EnvioNewsletter[];
  siteUrl: string;
}) {
  const [asunto, setAsunto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [destinoSel, setDestinoSel] = useState("");
  const [linkOtro, setLinkOtro] = useState("");
  const [textoBoton, setTextoBoton] = useState("Ver la promoción");
  const [subiendo, setSubiendo] = useState(false);
  const [audiencia, setAudiencia] = useState<ResumenAudiencia | null>(null);
  const [errorAudiencia, setErrorAudiencia] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [probando, startPrueba] = useTransition();
  const [enviando, startEnvio] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const linkUrl = destinoSel === OTRO ? linkOtro.trim() : destinoSel;
  const contenido = { asunto, titulo, texto, imagenUrl, linkUrl, textoBoton };

  const grupos = useMemo(() => {
    const m = new Map<string, DestinoNewsletter[]>();
    for (const d of destinos) m.set(d.grupo, [...(m.get(d.grupo) ?? []), d]);
    return [...m.entries()];
  }, [destinos]);

  const cargarAudiencia = () => {
    setErrorAudiencia(null);
    getAudienciaNewsletterAction().then((r) => {
      if (r.ok) setAudiencia(r.audiencia);
      else setErrorAudiencia(r.error);
    });
  };
  useEffect(cargarAudiencia, []);

  const subirImagen = async (file: File) => {
    setSubiendo(true);
    try {
      setImagenUrl(await uploadToCloudinary(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  const enviarPrueba = () => {
    setMensaje(null);
    startPrueba(async () => {
      const r = await enviarPruebaNewsletterAction(contenido);
      setMensaje(r.ok ? { tipo: "ok", texto: `Te mandamos la prueba a ${r.email}. Revisá la bandeja (y Spam/Promociones).` } : { tipo: "error", texto: r.error });
    });
  };

  const enviarATodos = () => {
    if (!audiencia || audiencia.total === 0) return;
    if (!confirm(`Se va a enviar "${asunto}" a ${audiencia.total} personas. No se puede deshacer. ¿Enviar ahora?`)) return;
    setMensaje(null);
    startEnvio(async () => {
      const r = await enviarNewsletterAction(contenido, audiencia.total);
      if (r.ok) {
        setMensaje({
          tipo: "ok",
          texto: `Newsletter enviado a ${r.enviados} personas${r.fallidos ? ` (${r.fallidos} no se pudieron enviar)` : ""}.`,
        });
        cargarAudiencia();
      } else setMensaje({ tipo: "error", texto: r.error });
    });
  };

  const incompleto = !asunto.trim() || !linkUrl || (!imagenUrl && !texto.trim());

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-6">
        {/* Destinatarios */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 text-brand-green-700" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-black">Destinatarios</p>
              <p className="text-xs text-brand-black/60">
                Personas que agendaron una visita y todavía no son clientes (no reservaron ni compraron). No se incluye a
                quien se dio de baja.
              </p>
              {errorAudiencia ? (
                <p className="mt-2 text-sm text-red-600">{errorAudiencia}</p>
              ) : !audiencia ? (
                <p className="mt-2 text-sm text-brand-black/50">Calculando…</p>
              ) : (
                <>
                  <p className="mt-2 font-display text-3xl font-bold text-brand-black">{audiencia.total}</p>
                  <p className="text-xs text-brand-black/50">
                    Se excluyen {audiencia.excluidosClientes} clientes
                    {audiencia.excluidosBajas ? ` y ${audiencia.excluidosBajas} bajas` : ""}.
                  </p>
                  {audiencia.muestra.length > 0 && (
                    <p className="mt-2 truncate text-xs text-brand-black/40">
                      Ej.: {audiencia.muestra.slice(0, 3).join(" · ")}
                    </p>
                  )}
                  {audiencia.faltaTablaBajas && (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      Antes del primer envío hay que correr <b>sql-newsletter.sql</b> en Supabase (SQL Editor). Sin eso
                      se puede mandar la prueba, pero no el envío a todos.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Contenido */}
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <label className={labelClass}>Asunto del mail *</label>
            <input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej: Nuevos lotes en Arroyos de San Vicente" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Imagen de la promoción</label>
            <div className="flex flex-wrap items-center gap-2">
              {isCloudinaryConfigured() && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={subiendo}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-black/20 px-4 py-2.5 text-sm text-brand-black/70 hover:border-brand-green-600 disabled:opacity-60"
                >
                  {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {subiendo ? "Subiendo..." : imagenUrl ? "Cambiar imagen" : "Subir imagen"}
                </button>
              )}
              {imagenUrl && (
                <button type="button" onClick={() => setImagenUrl("")} className="text-xs text-brand-black/50 underline">
                  Quitar
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
            />
            <input
              value={imagenUrl}
              onChange={(e) => setImagenUrl(e.target.value)}
              placeholder="…o pegá el link de una imagen"
              className={`${inputClass} mt-2`}
            />
            <p className="mt-1 text-[11px] text-brand-black/45">Tocar la imagen también lleva a la página elegida.</p>
          </div>

          <div>
            <label className={labelClass}>Título (opcional)</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Lotes de 600 m² con financiación directa" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Texto (opcional)</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              placeholder={"Contá la promoción en pocas líneas.\n\nDejá una línea en blanco para separar párrafos."}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Al hacer clic lleva a *</label>
              <select value={destinoSel} onChange={(e) => setDestinoSel(e.target.value)} className={inputClass}>
                <option value="">Elegí una página…</option>
                {grupos.map(([grupo, lista]) => (
                  <optgroup key={grupo} label={grupo}>
                    {lista.map((d) => (
                      <option key={d.url} value={d.url}>
                        {d.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value={OTRO}>Otro link…</option>
              </select>
              {destinoSel === OTRO && (
                <input value={linkOtro} onChange={(e) => setLinkOtro(e.target.value)} placeholder={`${siteUrl}/...`} className={`${inputClass} mt-2`} />
              )}
            </div>
            <div>
              <label className={labelClass}>Texto del botón</label>
              <input value={textoBoton} onChange={(e) => setTextoBoton(e.target.value)} className={inputClass} />
            </div>
          </div>
          <p className="text-[11px] text-brand-black/45">
            El link sale marcado como &quot;newsletter&quot; (UTM), así las visitas que genere se pueden ver en Analytics y
            usar para públicos de remarketing en Meta.
          </p>
        </section>

        {mensaje && (
          <p className={`rounded-xl p-4 text-sm ${mensaje.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
            {mensaje.texto}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={enviarPrueba}
            disabled={incompleto || probando || enviando}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-black/15 bg-white px-5 text-sm font-semibold text-brand-black disabled:opacity-50"
          >
            {probando && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviarme una prueba
          </button>
          <button
            type="button"
            onClick={enviarATodos}
            disabled={incompleto || enviando || probando || !audiencia || audiencia.total === 0 || audiencia.faltaTablaBajas}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-green-700 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {enviando ? "Enviando… no cierres la página" : `Enviar a ${audiencia?.total ?? "…"} personas`}
          </button>
        </div>

        {envios.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="font-semibold text-brand-black">Últimos envíos</p>
            <ul className="mt-3 divide-y divide-black/5 text-sm">
              {envios.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span className="min-w-0 truncate font-medium text-brand-black">{e.asunto}</span>
                  <span className="text-xs text-brand-black/50">
                    {new Date(e.creadoEn).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })} ·{" "}
                    {e.enviados}/{e.destinatarios} enviados
                    {e.fallidos ? ` · ${e.fallidos} fallidos` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Vista previa */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-black/50">Vista previa</p>
        <div className="overflow-hidden rounded-2xl bg-[#f4f4f1] p-3">
          <div className="overflow-hidden rounded-xl bg-white">
            <div className="bg-[#0f1f17] px-4 py-3 text-sm text-white">
              <b className="tracking-wider">MATULOTES</b>
              <span className="text-xs text-[#d4b46a]"> · De Nunzio Negocios Inmobiliarios</span>
            </div>
            {imagenUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagenUrl} alt="" className="block w-full" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-black/5 text-xs text-brand-black/40">Imagen</div>
            )}
            <div className="space-y-3 p-4 text-sm text-[#333]">
              <p>Hola Juan,</p>
              {titulo && <p className="text-lg font-bold leading-snug text-[#154a2e]">{titulo}</p>}
              {texto
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p.trim()}
                  </p>
                ))}
              <div className="pt-1 text-center">
                <span className="inline-block rounded-full bg-[#08743e] px-5 py-2.5 font-bold text-white">{textoBoton || "Ver más"}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#888]">Recibís este correo porque agendaste una visita… · Darse de baja</p>
        </div>
        {linkUrl && <p className="mt-2 break-all text-[11px] text-brand-black/45">Destino: {linkUrl}</p>}
      </aside>
    </div>
  );
}
