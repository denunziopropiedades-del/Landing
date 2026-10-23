"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { CategoriaPunto, PuntoMapa } from "@/lib/mapa";

/**
 * Mapa con un punto por publicación (venta, alquiler, campo) y por desarrollo.
 * Usa Leaflet y mapas de CARTO/OpenStreetMap.
 */

export const CATEGORIAS: { value: CategoriaPunto; label: string; color: string }[] = [
  { value: "desarrollo", label: "Desarrollos", color: "#c9a14a" },
  { value: "venta", label: "En venta", color: "#154a2e" },
  { value: "alquiler", label: "En alquiler", color: "#2f5d8a" },
  { value: "campo", label: "Campos", color: "#8a5a1c" },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
type L = any; // Leaflet no trae tipos
declare global {
  interface Window {
    L?: L;
  }
}

/**
 * Leaflet viene incluido en la web (paquete npm), así no depende de un CDN externo
 * que algunos navegadores o redes bloquean.
 */
async function cargarLeaflet(): Promise<L> {
  if (window.L) return window.L;
  const mod = await import("leaflet");
  const L = mod.default ?? mod;
  window.L = L;
  return L;
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default function MapaPuntos({ puntos, alto = 520, compacto = false }: { puntos: PuntoMapa[]; alto?: number; compacto?: boolean }) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<any>(null);
  const capa = useRef<any>(null);
  const [activas, setActivas] = useState<Set<CategoriaPunto>>(new Set(CATEGORIAS.map((c) => c.value)));
  const [error, setError] = useState(false);
  const [listo, setListo] = useState(false);

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of puntos) c[p.categoria] = (c[p.categoria] ?? 0) + 1;
    return c;
  }, [puntos]);

  useEffect(() => {
    let vivo = true;
    cargarLeaflet()
      .then((L) => {
        if (!vivo || !div.current || mapa.current) return;
        const m = L.map(div.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([-35.1, -58.4], 8);
        const carto = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          subdomains: "abcd",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        }).addTo(m);
        // Si los mapas de CARTO no cargan, se pasa a los de OpenStreetMap.
        let fallas = 0;
        carto.on("tileerror", () => {
          if (++fallas !== 4) return;
          m.removeLayer(carto);
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(m);
        });
        // La rueda del mouse hace zoom recién después de tocar el mapa (así no traba el scroll de la página).
        m.on("click focus", () => m.scrollWheelZoom.enable());
        m.on("mouseout", () => m.scrollWheelZoom.disable());
        // Si la hoja de estilos de Leaflet llega después, se recalcula el tamaño para que no queden huecos.
        setTimeout(() => m.invalidateSize(), 400);
        setTimeout(() => m.invalidateSize(), 1500);
        mapa.current = m;
        capa.current = L.layerGroup().addTo(m);
        setListo(true);
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!listo || !L || !mapa.current || !capa.current) return;
    capa.current.clearLayers();
    const visibles = puntos.filter((p) => activas.has(p.categoria));
    for (const p of visibles) {
      const cat = CATEGORIAS.find((c) => c.value === p.categoria)!;
      const grande = p.categoria === "desarrollo";
      const icono = L.divIcon({
        className: "",
        iconSize: grande ? [34, 34] : [24, 24],
        iconAnchor: grande ? [17, 17] : [12, 12],
        html: `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:999px;background:${cat.color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);${p.aproximado ? "outline:2px dashed " + cat.color + ";outline-offset:3px;" : ""}">${grande ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0b0f0d" stroke-width="2.4"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>' : ""}</span>`,
      });
      const foto = p.foto ? `<img src="${esc(p.foto)}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:10px;margin-bottom:8px" loading="lazy">` : "";
      const html = `<div style="width:220px;font-family:inherit">${foto}
        <span style="display:inline-block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#fff;background:${cat.color};border-radius:999px;padding:2px 8px">${cat.label.replace(/^En /, "")}</span>
        <div style="margin-top:6px;font-weight:700;font-size:14px;line-height:1.25;color:#0b0f0d">${esc(p.titulo)}</div>
        <div style="margin-top:2px;font-size:12px;color:#555">${esc(p.detalle)}</div>
        ${p.precio ? `<div style="margin-top:4px;font-weight:800;font-size:14px;color:#0b0f0d">${esc(p.precio)}</div>` : ""}
        ${p.aproximado ? '<div style="margin-top:4px;font-size:11px;color:#8a5a1c">Ubicación aproximada (zona)</div>' : ""}
        <a href="${esc(p.href)}" style="display:block;margin-top:8px;text-align:center;background:#0b0f0d;color:#fff;border-radius:999px;padding:7px 0;font-size:12px;font-weight:700;text-decoration:none">Ver publicación</a></div>`;
      L.marker([p.lat, p.lng], { icon: icono, title: p.titulo, riseOnHover: true }).bindPopup(html, { maxWidth: 240 }).addTo(capa.current);
    }
    if (visibles.length) {
      const b = L.latLngBounds(visibles.map((p) => [p.lat, p.lng] as [number, number]));
      mapa.current.fitBounds(b, { padding: [40, 40], maxZoom: visibles.length === 1 ? 13 : 12 });
    }
  }, [listo, puntos, activas]);

  const alternar = (c: CategoriaPunto) =>
    setActivas((prev) => {
      const s = new Set(prev);
      if (s.has(c) && s.size > 1) s.delete(c);
      else s.add(c);
      return s;
    });

  return (
    <div>
      <div className={`flex flex-wrap gap-2 ${compacto ? "mb-3" : "mb-4"}`}>
        {CATEGORIAS.map((c) => {
          const on = activas.has(c.value);
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => alternar(c.value)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${on ? "border-brand-black bg-white text-brand-black" : "border-black/10 bg-white/60 text-brand-black/45"}`}
            >
              <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: c.color, opacity: on ? 1 : 0.4 }} />
              {c.label}
              <span className="text-brand-black/45">{conteo[c.value] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="relative isolate overflow-hidden rounded-3xl border border-black/10 bg-[#e8e4da]" style={{ height: alto }}>
        <div ref={div} className="absolute inset-0 z-0" />
        {!listo && !error && <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-black/50">Cargando mapa…</div>}
        {error && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-brand-black/60">No se pudo cargar el mapa. Probá recargar la página.</div>}
      </div>
      <p className="mt-2 text-xs text-brand-black/50">Los puntos con borde punteado tienen ubicación aproximada (zona). Tocá un punto para ver la publicación.</p>
    </div>
  );
}
