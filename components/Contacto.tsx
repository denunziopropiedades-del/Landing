"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { contactoSchema, type ContactoInput } from "@/lib/schemas";
import type { SiteTextos } from "@/types/site";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "@/components/icons/SocialIcons";

const MAPS_EMBED_URL =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ??
  "https://maps.google.com/maps?q=Guernica%2C%20Buenos%20Aires&t=k&z=13&ie=UTF8&iwloc=&output=embed";

export default function Contacto({ textos }: { textos: SiteTextos }) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactoInput>({ resolver: zodResolver(contactoSchema) });

  const onSubmit = async (data: ContactoInput) => {
    setEstado("enviando");
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("request-failed");
      setEstado("ok");
      reset();
    } catch {
      setEstado("error");
    }
  };

  const social = [
    { href: textos.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: textos.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: textos.youtube, label: "YouTube", Icon: YoutubeIcon },
  ];

  return (
    <section id="contacto" className="bg-brand-black py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Contacto</h2>
          <p className="mt-3 text-white/70">Estamos para ayudarte a dar el siguiente paso.</p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          {estado === "ok" ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-gold-400/30 bg-white/5 p-10 text-center">
              <Send className="h-10 w-10 text-brand-gold-400" />
              <p className="font-display text-xl font-bold text-white">¡Gracias por escribirnos!</p>
              <p className="text-sm text-white/70">En breve nos pondremos en contacto con vos.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Nombre</label>
                <input {...register("nombre")} className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-2.5 text-white focus:border-brand-gold-400 focus:outline-none" />
                {errors.nombre && <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Email</label>
                <input type="email" {...register("email")} className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-2.5 text-white focus:border-brand-gold-400 focus:outline-none" />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Teléfono</label>
                <input {...register("telefono")} className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-2.5 text-white focus:border-brand-gold-400 focus:outline-none" />
                {errors.telefono && <p className="mt-1 text-xs text-red-400">{errors.telefono.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Mensaje</label>
                <textarea rows={4} {...register("mensaje")} className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-2.5 text-white focus:border-brand-gold-400 focus:outline-none" />
                {errors.mensaje && <p className="mt-1 text-xs text-red-400">{errors.mensaje.message}</p>}
              </div>

              {estado === "error" && <p className="text-sm text-red-400">Ocurrió un error. Probá nuevamente.</p>}

              <button
                type="submit"
                disabled={estado === "enviando"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-gold-500 px-8 py-3.5 font-semibold text-brand-black transition hover:bg-brand-gold-400 disabled:opacity-60"
              >
                {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar consulta
              </button>
            </form>
          )}

          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title="Mapa de contacto"
                src={MAPS_EMBED_URL}
                width="100%"
                height="240"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={buildWhatsappUrl(textos.whatsappMensajeDefault, textos.whatsappNumero)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366]/15 px-4 py-2 text-sm font-medium text-[#25D366]"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a
                href={`mailto:${textos.email}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:text-white"
              >
                <Mail className="h-4 w-4" /> {textos.email}
              </a>
              {textos.telefonoOficina && (
                <a
                  href={`tel:${textos.telefonoOficina.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:text-white"
                >
                  <Phone className="h-4 w-4" /> Oficina: {textos.telefonoOficina}
                </a>
              )}
            </div>

            {social.some(({ href }) => href) && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white/60">Seguime:</span>
                <div className="flex items-center gap-2.5">
                  {social
                    .filter(({ href }) => href)
                    .map(({ href, label, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        title={label}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-110 hover:opacity-90"
                      >
                        <Icon className="h-10 w-10" />
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
