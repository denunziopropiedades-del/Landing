import MensajesInbox from "@/components/admin/MensajesInbox";
import { getPerfilActual } from "@/lib/admin/auth";
import { getBandeja, getRespuestasRapidas } from "@/lib/admin/mensajes-actions";
import ConectarWhatsapp from "@/components/admin/ConectarWhatsapp";
import { getNumerosConectados } from "@/lib/admin/whatsapp-conexion-actions";
import { META_APP_ID, WA_SIGNUP_CONFIG_ID } from "@/lib/mensajeria";

export const dynamic = "force-dynamic";

export default async function AdminMensajesPage() {
  const [actual, { conversaciones, canales, faltaTabla }, respuestas, conectados] = await Promise.all([
    getPerfilActual(),
    getBandeja(),
    getRespuestasRapidas(),
    getNumerosConectados(),
  ]);
  const esAdmin = actual?.rol === "administrador";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Mensajes</h1>
      <p className="mt-1 text-sm text-brand-black/60">WhatsApp y Messenger en un solo lugar. Cada conversación queda unida a la ficha del cliente.</p>

      {faltaTabla && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta correr <b>sql-mensajes.sql</b> en Supabase (SQL Editor) para activar la bandeja.
        </p>
      )}
      {!faltaTabla && esAdmin && (
        <div className="mt-4">
          <ConectarWhatsapp appId={META_APP_ID} configId={WA_SIGNUP_CONFIG_ID} conectados={conectados} />
        </div>
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
