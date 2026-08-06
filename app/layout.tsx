import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getSiteTextos } from "@/lib/content";
import FloatingWidgets from "@/components/FloatingWidgets";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.matulotes.com.ar";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Matu Lotes | Lotes con escritura garantizada",
    template: "%s | Matu Lotes",
  },
  description:
    "Matu Lotes: encontrá tu lote ideal en los desarrollos inmobiliarios con escritura garantizada de mayor crecimiento del Gran Buenos Aires.",
  keywords: [
    "lotes en venta Buenos Aires",
    "Matu Lotes",
    "terrenos en venta Buenos Aires",
    "lotes con escritura",
    "inversión inmobiliaria Gran Buenos Aires",
  ],
  authors: [{ name: "Matu Lotes" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Matu Lotes",
    title: "Matu Lotes | Lotes con escritura garantizada",
    description:
      "Encontrá tu lote ideal en los desarrollos inmobiliarios con escritura garantizada de mayor crecimiento del Gran Buenos Aires.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Matu Lotes",
    description:
      "Encontrá tu lote ideal en los desarrollos inmobiliarios con escritura garantizada de mayor crecimiento del Gran Buenos Aires.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const realEstateSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "Matu Lotes",
  description:
    "Plataforma inmobiliaria especializada en venta de lotes con escritura garantizada en el Gran Buenos Aires.",
  url: SITE_URL,
  email: "denunziopropiedades@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Buenos Aires",
    addressCountry: "AR",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const textos = await getSiteTextos();

  return (
    <html lang="es-AR" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-brand-black">
        {GTM_ID && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        )}
        {GA4_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${GA4_ID}');`}
            </Script>
          </>
        )}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${META_PIXEL_ID}');fbq('track', 'PageView');`}
          </Script>
        )}
        {children}
        <FloatingWidgets mensaje={textos.whatsappMensajeDefault} numero={textos.whatsappNumero} />
      </body>
    </html>
  );
}
