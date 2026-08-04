import { NextResponse } from "next/server";
import { z } from "zod";
import { lotes } from "@/lib/data";
import { getPreferenceClient, isMercadoPagoConfigured } from "@/lib/mercadopago";

const SENA_PORCENTAJE = 10;

const bodySchema = z.object({
  loteId: z.string().min(1),
  nombre: z.string().trim().min(2),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado. Definí MERCADOPAGO_ACCESS_TOKEN para habilitar el pago online de la seña." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { loteId, nombre, email } = parsed.data;
  const lote = lotes.find((l) => l.id === loteId);
  if (!lote) {
    return NextResponse.json({ error: "Lote inválido" }, { status: 400 });
  }

  const monto = Math.round((lote.precioUsd * SENA_PORCENTAJE) / 100);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const preference = getPreferenceClient()!;
  const result = await preference.create({
    body: {
      items: [
        {
          id: lote.id,
          title: `Seña reserva ${lote.nombre} — Ayres de Guernica`,
          quantity: 1,
          unit_price: monto,
          currency_id: "USD",
        },
      ],
      payer: { name: nombre, email },
      back_urls: {
        success: `${siteUrl}/reserva/exito`,
        failure: `${siteUrl}/reserva/error`,
        pending: `${siteUrl}/reserva/pendiente`,
      },
      auto_return: "approved",
      external_reference: `${lote.id}-${Date.now()}`,
    },
  });

  return NextResponse.json({ initPoint: result.init_point });
}
