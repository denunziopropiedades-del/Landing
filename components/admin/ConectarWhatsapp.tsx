"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Smartphone } from "lucide-react";
import { conectarWhatsappAction, type NumeroConectado } from "@/lib/admin/whatsapp-conexion-actions";

declare global {
  interface Window {
    FB?: {
      init: (o: Record<string, unknown>) => void;
      login: (cb: (r: { authResponse?: { code?: string } | null; status?: string }) => void, o: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function numeroLindo(n: string | null) {
  if (!n) return "";
  const d = n.replace(/\D/g, "").replace(/^549?/, "");
  return d.length === 10 ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : n;
}

/**
 * Botón para conectar un número que ya usa la app WhatsApp Business (coexistencia).
 * Abre el alta oficial de Meta; el número sigue funcionando en el celular.
 */
export default function ConectarWhatsapp({
  appId,
  configId,
  conectados,
}: {
  appId: string;
  configId: string;
  conectados: NumeroConectado[];
}) {
  const [lista, setLista] = useState(conectados);
  const [estado, setEstado] = useState<{ msg: string; tipo: "" | "ok" | "err" }>({ msg: "", tipo: "" });
  const [cargando, setCargando] = useState(false);
  const [sdkListo, setSdkListo] = useState(false);
  const sesion = useRef<{ wabaId?: string; phoneNumberId?: string; code?: string }>({});

  useEffect(() => {
    if (window.FB) {
      setSdkListo(true);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
      setSdkListo(true);
    };
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/es_LA/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    document.body.appendChild(s);
  }, [appId]);

  const terminar = async () => {
    const { code, wabaId, phoneNumberId } = sesion.current;
    if (!code || !wabaId || !phoneNumberId) return;
    sesion.current = {};
    setEstado({ msg: "Conectando el número con el panel…", tipo: "" });
    const r = await conectarWhatsappAction({ code, wabaId, phoneNumberId });
    setCargando(false);
    if (!r.ok) {
      setEstado({ msg: r.error, tipo: "err" });
      return;
    }
    setEstado({ msg: `Listo: el ${numeroLindo(r.numero)} quedó conectado. Ya podés recibir y responder desde acá.`, tipo: "ok" });
    setLista((prev) => [
      ...prev.filter((x) => x.numero !== r.numero),
      { id: phoneNumberId, numero: r.numero, nombre: "", conectadoEn: new Date().toISOString(), tokenVence: null },
    ]);
  };

  // Meta avisa por postMessage qué cuenta y número se conectaron.
  useEffect(() => {
    const oir = (ev: MessageEvent) => {
      if (!/facebook\.com$/.test(new URL(ev.origin).hostname)) return;
      let d: { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string; current_step?: string } };
      try {
        d = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
      } catch {
        return;
      }
      if (d?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (d.event?.startsWith("FINISH")) {
        sesion.current.wabaId = d.data?.waba_id;
        sesion.current.phoneNumberId = d.data?.phone_number_id;
        terminar();
      } else if (d.event === "CANCEL") {
        setCargando(false);
        setEstado({ msg: "Se cerró el alta sin terminar. Tu número sigue igual en el celular.", tipo: "" });
      } else if (d.event === "ERROR") {
        setCargando(false);
        setEstado({ msg: "Meta mostró un error en el alta. Probá de nuevo o mandame una captura.", tipo: "err" });
      }
    };
    window.addEventListener("message", oir);
    return () => window.removeEventListener("message", oir);
  });

  const conectar = () => {
    if (!window.FB) return;
    setCargando(true);
    setEstado({ msg: "Seguí los pasos en la ventana de Meta. Elegí conectar tu app WhatsApp Business y escaneá el QR desde el celular.", tipo: "" });
    window.FB.login(
      (r) => {
        const code = r.authResponse?.code;
        if (!code) {
          setCargando(false);
          if (!sesion.current.phoneNumberId) setEstado({ msg: "No se completó el alta. Tu número sigue igual en el celular.", tipo: "" });
          return;
        }
        sesion.current.code = code;
        terminar();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
      }
    );
  };

  return (
    <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-brand-black">Números de WhatsApp conectados</p>
          <p className="text-xs text-brand-black/60">
            Se conectan en modo coexistencia: el número sigue funcionando en la app WhatsApp Business del celular.
          </p>
        </div>
        <button
          onClick={conectar}
          disabled={!sdkListo || cargando}
          className="flex items-center gap-2 rounded-lg bg-[#25d366] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          <Smartphone className="h-4 w-4" />
          {cargando ? "Conectando…" : "Conectar WhatsApp Business"}
        </button>
      </div>
      {lista.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {lista.map((n) => (
            <li key={n.id} className="flex items-center gap-1.5 rounded-full bg-[#e9f9ef] px-3 py-1 text-xs font-semibold text-[#128c4a]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {numeroLindo(n.numero) || n.nombre}
              {n.tokenVence && new Date(n.tokenVence).getTime() - Date.now() < 10 * 86400000 && (
                <span className="ml-1 text-amber-700">· reconectar antes del {new Date(n.tokenVence).toLocaleDateString("es-AR")}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {estado.msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            estado.tipo === "ok" ? "bg-green-50 text-green-800" : estado.tipo === "err" ? "bg-red-50 text-red-700" : "bg-brand-cream text-brand-black/80"
          }`}
        >
          {estado.msg}
        </p>
      )}
    </div>
  );
}
