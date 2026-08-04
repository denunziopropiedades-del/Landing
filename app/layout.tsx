import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getSiteTextos } from "@/lib/content";
import WhatsappFloatButton from "@/components/WhatsappFloatButton";
import ChatbotWidget from "@/components/ChatbotWidget";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ayresdeguernica.com.ar";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ayres de Guernica – Etapa 2 | Lotes con escritura garantizada",
    template: "%s | Ayres de Guernica",
  },
  description:
    "Invertí en tu lote en Ayres de Guernica, Buenos Aires. Lotes de 300, 600 y 900 m² con escritura garantizada, financiación propia y excelente ubicación en una de las zonas de mayor crecimiento del sur del GBA.",
  keywords: [
    "lotes en Guernica",
    "Ayres de Guernica",
    "terrenos en venta Buenos Aires",
    "lotes con escritura",
    "inversión inmobiliaria sur GBA",
  ],
  authors: [{ name: "Ayres de Guernica" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Ayres de Guernica",
    title: "Ayres de Guernica – Etapa 2 | Lotes con escritura garantizada",
    description:
      "Lotes con escritura garantizada en una de las zonas con mayor crecimiento del sur del Gran Buenos Aires.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ayres de Guernica – Etapa 2",
    description:
      "Lotes con escritura garantizada en una de las zonas con mayor crecimiento del sur del Gran Buenos Aires.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const realEstateSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  name: "Ayres de Guernica – Etapa 2",
  description:
    "Lotes con escritura garantizada en Guernica, Buenos Aires. Financiación propia disponible.",
  url: SITE_URL,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Guernica",
    addressRegion: "Buenos Aires",
    addressCountry: "AR",
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: 2700,
    highPrice: 8100,
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
        <WhatsappFloatButton mensaje={textos.whatsappMensajeDefault} numero={textos.whatsappNumero} />
        <ChatbotWidget />
      </body>
    </html>
  );
}
