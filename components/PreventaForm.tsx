"use client";

import { useState, type FormEvent } from "react";

// Apps Script que guarda cada inscripción en la planilla "Inscripciones Preventa" de Google Sheets.
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyMhW9G4gXNZuP4H9oQ9mQTV7-tMpukxmnez-DlX4-aBcGsWkDqRfjisqflEpnfPhBt/exec";
const PREVENTA = "Preventa terrenos 20x30 - Ruta 210";
// Las consultas por WhatsApp se reparten al azar entre los dos números.
const WHATSAPPS = ["5491127424512", "5491161365523"];

type Campo = "nombre" | "apellido" | "whatsapp" | "email" | "acepto";
type Errores = Partial<Record<Campo, string>>;

function validar(fd: FormData): Errores {
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const e: Errores = {};
  if (!v("nombre")) e.nombre = "Ingresá tu nombre";
  if (!v("apellido")) e.apellido = "Ingresá tu apellido";
  if (v("whatsapp").replace(/\D/g, "").length < 8) e.whatsapp = "Ingresá un número de WhatsApp válido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email"))) e.email = "Ingresá un email válido";
  if (!fd.get("acepto")) e.acepto = "Tenés que aceptar para inscribirte";
  return e;
}

export default function PreventaForm() {
  const [errores, setErrores] = useState<Errores>({});
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [waHref, setWaHref] = useState("https://wa.me/" + WHATSAPPS[0]);

  const onSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const fd = new FormData(form);
    const errs = validar(fd);
    setErrores(errs);
    const primero = Object.keys(errs)[0];
    if (primero) {
      const el = form.elements.namedItem(primero);
      if (el instanceof HTMLElement) el.focus();
      return;
    }

    setEstado("enviando");
    const qs = new URLSearchParams(window.location.search);
    const data = new URLSearchParams();
    fd.forEach((val, key) => data.set(key, String(val)));
    data.set("preventa", PREVENTA);
    data.set("pagina", window.location.href);
    ["utm_source", "utm_medium", "utm_campaign"].forEach((k) => data.set(k, qs.get(k) ?? ""));

    try {
      const res = await fetch(SCRIPT_URL, { method: "POST", body: data });
      const out = (await res.json()) as { ok: boolean };
      if (!out.ok) throw new Error("rechazado");
      const numero = WHATSAPPS[Math.floor(Math.random() * WHATSAPPS.length)];
      const texto = `Hola! Me anoté a la preventa de terrenos 20x30. Te escribo desde: ${window.location.href}`;
      setWaHref(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`);
      setEstado("ok");
      // Evento Lead para el Pixel de Meta (si está cargado).
      const w = window as unknown as { fbq?: (...args: unknown[]) => void };
      w.fbq?.("track", "Lead", { content_name: PREVENTA });
    } catch {
      setEstado("error");
    }
  };

  if (estado === "ok") {
    return (
      <div className="ok-box" role="status">
        <div className="tilde">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#0E1A2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h3>¡Ya estás anotado!</h3>
        <p>Recibimos tus datos. Te vamos a contactar antes del lanzamiento con el precio de preventa.</p>
        <a className="wa-btn" href={waHref} target="_blank" rel="noopener noreferrer">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6L3 21z" /></svg>
          Escribinos por WhatsApp
        </a>
      </div>
    );
  }

  const cls = (c: Campo) => (errores[c] ? "invalid" : undefined);
  const err = (c: Campo) => (errores[c] ? <div className="msg-err" id={`err-${c}`}>{errores[c]}</div> : null);
  const desc = (c: Campo) => (errores[c] ? `err-${c}` : undefined);

  return (
    <>
      <h3 id="form-title">Inscripción a la preventa</h3>
      <p className="sub">Completá tus datos y te contactamos antes del lanzamiento.</p>

      <form onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="nombre">Nombre <span className="req">*</span></label>
          <input id="nombre" name="nombre" autoComplete="given-name" className={cls("nombre")} aria-invalid={!!errores.nombre} aria-describedby={desc("nombre")} />
          {err("nombre")}
        </div>
        <div>
          <label htmlFor="apellido">Apellido <span className="req">*</span></label>
          <input id="apellido" name="apellido" autoComplete="family-name" className={cls("apellido")} aria-invalid={!!errores.apellido} aria-describedby={desc("apellido")} />
          {err("apellido")}
        </div>
        <div>
          <label htmlFor="whatsapp">WhatsApp <span className="req">*</span></label>
          <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ej: 11 2345 6789" className={cls("whatsapp")} aria-invalid={!!errores.whatsapp} aria-describedby={desc("whatsapp")} />
          {err("whatsapp")}
        </div>
        <div>
          <label htmlFor="email">Email <span className="req">*</span></label>
          <input id="email" name="email" type="email" autoComplete="email" className={cls("email")} aria-invalid={!!errores.email} aria-describedby={desc("email")} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="lotes">¿Cuántos lotes te interesan?</label>
          <select id="lotes" name="lotes" defaultValue="1 lote">
            <option value="1 lote">1 lote</option>
            <option value="2 lotes">2 lotes</option>
            <option value="3 o más">3 o más</option>
          </select>
        </div>
        <div>
          <label htmlFor="pago">Forma de pago</label>
          <select id="pago" name="pago" defaultValue="Cuotas">
            <option value="Cuotas">Cuotas</option>
            <option value="Contado">Contado</option>
            <option value="A definir">A definir</option>
          </select>
        </div>
        <div className="full">
          <label htmlFor="localidad">Localidad</label>
          <input id="localidad" name="localidad" autoComplete="address-level2" />
        </div>
        <div className="full">
          <label htmlFor="comentarios">Comentarios</label>
          <textarea id="comentarios" name="comentarios" placeholder="Ej: busco lote esquina, horario para que me llamen…" />
        </div>
        <div className="hp" aria-hidden="true">
          <label htmlFor="website">No completar</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="full">
          <label className="check">
            <input type="checkbox" id="acepto" name="acepto" aria-invalid={!!errores.acepto} aria-describedby={desc("acepto")} />
            Acepto que De Nunzio Negocios Inmobiliarios me contacte por WhatsApp o email con información de esta preventa.
          </label>
          {err("acepto")}
        </div>
        <button type="submit" className="btn-enviar" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando…" : "Quiero anotarme"}
        </button>
        {estado === "error" && (
          <p className="estado" role="alert">
            No pudimos enviar tu inscripción. Probá de nuevo en un momento o escribinos por WhatsApp.
          </p>
        )}
      </form>
    </>
  );
}
