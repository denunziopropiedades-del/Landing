import Image from "next/image";
import type { Banner } from "@/types/site";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export default function Banners({ items, numero }: { items: Banner[]; numero?: string }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-brand-cream py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-6 ${items.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {items.map((banner) => (
            <a
              key={banner.id}
              href={banner.linkUrl ?? buildWhatsappUrl(undefined, numero)}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-2xl border border-black/5 shadow-sm transition hover:shadow-xl"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={banner.imagenUrl}
                  alt={banner.titulo}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
