"use client";

import { useEffect } from "react";
import { COOKIE_ORIGEN, clasificarOrigen } from "@/lib/leads";

/**
 * Guarda de dónde llegó la persona a la web (Meta, Google, Instagram, campaña…) en una cookie,
 * para que cuando complete cualquier formulario el lead quede con su origen en el CRM.
 * Si vuelve a entrar desde una campaña, se actualiza con la última campaña.
 */
export default function OrigenTracker() {
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const utmSource = qs.get("utm_source");
      const tieneCampania = Boolean(utmSource || qs.get("fbclid") || qs.get("gclid"));
      const yaGuardado = document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_ORIGEN}=`));
      if (yaGuardado && !tieneCampania) return;

      const referrer = document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : "";
      const datos = {
        origen: clasificarOrigen({
          utmSource,
          utmMedium: qs.get("utm_medium"),
          fbclid: qs.has("fbclid"),
          gclid: qs.has("gclid"),
          referrer,
        }),
        utm_source: utmSource ?? "",
        utm_medium: qs.get("utm_medium") ?? "",
        utm_campaign: qs.get("utm_campaign") ?? "",
      };
      const valor = encodeURIComponent(JSON.stringify(datos));
      document.cookie = `${COOKIE_ORIGEN}=${valor}; path=/; max-age=${60 * 60 * 24 * 60}; SameSite=Lax`;
    } catch {
      // Sin cookies (modo privado estricto): el lead se guarda igual, sin origen.
    }
  }, []);
  return null;
}
