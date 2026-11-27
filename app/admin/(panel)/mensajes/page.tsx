import MensajesInbox from "@/components/admin/MensajesInbox";
import { getPerfilActual } from "@/lib/admin/auth";
import { getBandeja, getRespuestasRapidas } from "@/lib/admin/mensajes-actions";

export const dynamic = "force-dynamic";

export default async function AdminMensajesPage() {
  const [actual, { conversaciones, canales, faltaTabla }, respuestas] = await Promise.all([
    getPerfilActual(),
    getBandeja(),
    getRespuestasRapidas(),
  ]);
  const faltaConfig = !process.env.WHATSAPP_TOKEN || !process.env.META_APP_SECRET;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Mensajes</h1>
      <p className="mt-1 text-sm text-brand-black/60">WhatsApp y Messenger en un solo lugar. Cada conversación queda unida a la ficha del cliente.</p>

      {faltaTabla && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta correr <b>sql-mensajes.sql</b> en Supabase (SQL Editor) para activar la bandeja.
        </p>
      )}
      {!faltaTabla && faltaConfig && actual?.rol === "administrador" && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta conectar WhatsApp: cargá <b>WHATSAPP_TOKEN</b> y <b>META_APP_SECRET</b> en Vercel y configurá el webhook (ver README,
          sección “Bandeja de mensajes”).
        </p>
      )}

      <div className="mt-5">
        <MensajesInbox
          conversacionesIniciales={conversaciones}
          canalesIniciales={canales}
          respuestasIniciales={respuestas}
          puedeEditarRespuestas={actual?.rol === "administrador" || actual?.rol === "supervisor"}
        />
      </div>
    </div>
  );
}
