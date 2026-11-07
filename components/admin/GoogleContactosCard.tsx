"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { desconectarContactosAction, sincronizarContactosAction } from "@/lib/admin/actions";

export type EstadoContactos = {
  configurado: boolean;
  conectado: boolean;
  cuenta: string | null;
  pendientes: number;
  guardados: number;
  resultado: string | null;
};

const MENSAJES: Record<string, string> = {
  ok: "✅ Cuenta de Google conectada. Los clientes nuevos se van a guardar solos en tus contactos.",
  cancelado: "Se canceló la autorización de Google.",
  "sin-permiso": "Google no devolvió el permiso. Probá conectar de nuevo.",
  "error-estado": "La autorización venció. Probá conectar de nuevo.",
  error: "Hubo un error con Google. Probá conectar de nuevo.",
  "sin-configurar": "Falta configurar el Client ID y el Client Secret de Google.",
};

/** Conexión con Google Contactos: cada cliente nuevo se guarda como "Nombre Apellido Cte web". */
export default function GoogleContactosCard({ estado }: { estado: EstadoContactos }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [aviso, setAviso] = useState<string | null>(estado.resultado ? MENSAJES[estado.resultado] ?? null : null);

  return (
    <div className="rounded-xl border border-black/5 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-black">📇 Agenda de Google Contactos</p>
          <p className="text-xs text-brand-black/60">
            {estado.conectado
              ? `Conectada${estado.cuenta ? ` con ${estado.cuenta}` : ""}: cada cliente nuevo se guarda como "Nombre Apellido Cte web" con su teléfono y mail. ${estado.guardados} guardados, ${estado.pendientes} sin guardar.`
              : estado.configurado
                ? "Conectá tu cuenta de Google para que cada cliente nuevo se guarde solo en tus contactos."
                : "Falta configurar el acceso de Google (Client ID y Client Secret) para poder conectarla."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {estado.configurado && !estado.conectado && (
            <a href="/api/google/contactos/conectar" className="rounded-lg bg-brand-black px-3 py-1.5 text-xs font-semibold text-white">
              Conectar Google Contactos
            </a>
          )}
          {estado.conectado && estado.pendientes > 0 && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                start(async () => {
                  const r = await sincronizarContactosAction();
                  setAviso(r.ok ? r.aviso ?? "Listo." : r.error);
                  router.refresh();
                })
              }
              className="rounded-lg bg-brand-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pendiente ? "Guardando…" : `Guardar los ${Math.min(estado.pendientes, 200)} pendientes`}
            </button>
          )}
          {estado.conectado && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                confirm("¿Desconectar Google Contactos? Los contactos ya guardados quedan en tu agenda.") &&
                start(async () => {
                  await desconectarContactosAction();
                  router.refresh();
                })
              }
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-black/60"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>
      {aviso && <p className="mt-2 rounded-lg bg-black/[0.03] px-3 py-2 text-xs">{aviso}</p>}
    </div>
  );
}
