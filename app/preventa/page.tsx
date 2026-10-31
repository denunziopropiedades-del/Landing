import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import PreventaForm from "@/components/PreventaForm";
import "./preventa.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "¡Próximamente Preventa! Terrenos 20×30 con escritura",
  description:
    "Terrenos de 20×30 (600 m²) con escritura. Excelente zona y accesos: autopista, tren y Ruta 210. Anotate con anticipación para el mejor precio de lanzamiento.",
  alternates: { canonical: "/preventa" },
  openGraph: {
    title: "¡Próximamente Preventa! Terrenos 20×30 con escritura",
    description: "Anotate con anticipación para acceder al mejor precio de lanzamiento.",
    images: [{ url: "/preventa/flyer.jpg", width: 600, height: 1066 }],
  },
};

const WA_TEXTO = encodeURIComponent("Hola! Me interesa la preventa de terrenos 20x30.");

const Check = () => (
  <span className="ok">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E1A2E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
  </span>
);

const Logo = ({ w = 42, h = 34 }: { w?: number; h?: number }) => (
  <svg width={w} height={h} viewBox="0 0 42 34" aria-hidden="true">
    <path d="M2 20L19 4l7 6.5" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
    <path d="M24 4l16 15" fill="none" stroke="#7AD63B" strokeWidth="5" />
    <rect x="15" y="20" width="8" height="8" fill="#fff" />
  </svg>
);

const WaIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6L3 21z" /></svg>
);

export default function PreventaPage() {
  return (
    <div className={`pv ${montserrat.className}`}>
      <div className="topbar">
        <div className="wrap">
          <Link className="marca" href="/" aria-label="De Nunzio Negocios Inmobiliarios, ir al inicio">
            <Logo />
            <span><b>DE NUNZIO</b><small>NEGOCIOS INMOBILIARIOS</small></span>
          </Link>
          <a className="cta-top" href="#inscripcion">Anotate a la preventa</a>
        </div>
      </div>

      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="tag">TERRENOS CON ESCRITURA</span>
            <h1>¡Próximamente <span className="verde">preventa!</span></h1>
            <p className="bajada">Tu próximo terreno en una <b>ubicación estratégica</b>. Excelente zona y accesos.</p>
            <div className="accesos">
              <div className="acceso">
                <div className="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E1A2E" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6L5 21" /><path d="M16 6l3 15" /><path d="M12 9v2" /><path d="M12 14v2" /><path d="M12 19v2" /></svg></div>
                <b>Autopista</b><span>Excelente conectividad</span>
              </div>
              <div className="acceso">
                <div className="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E1A2E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="3" width="12" height="13" rx="3" /><path d="M6 10h12" /><circle cx="9" cy="13" r=".8" fill="#0E1A2E" /><circle cx="15" cy="13" r=".8" fill="#0E1A2E" /><path d="M8 20l-2 2" /><path d="M16 20l2 2" /><path d="M8 16l-1 4h10l-1-4" /></svg></div>
                <b>Vías del tren</b><span>A metros del predio</span>
              </div>
              <div className="acceso">
                <div className="ico"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M5 5h24v12c0 7-6 11-12 13C11 28 5 24 5 17z" fill="#0E1A2E" /><text x="17" y="20.5" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="10" fill="#fff">210</text></svg></div>
                <b>Ruta 210</b><span>Rápido acceso</span>
              </div>
            </div>
          </div>
          <Image
            className="flyer"
            src="/preventa/flyer.jpg"
            alt="Flyer de la preventa: terrenos de 20 por 30, 600 m² con escritura, cerca de autopista, tren y Ruta 210"
            width={600}
            height={1066}
            priority
          />
        </div>
      </header>

      <section className="datos" aria-label="Datos de los terrenos">
        <div className="datos-grid">
          <div className="dato">
            <small>TERRENOS DE</small>
            <div className="medida">20 × 30</div>
            <span className="chip-lima">600 m² de superficie</span>
          </div>
          <div className="dato">
            <div className="big"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0E1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" /><path d="M8 8h6" /><path d="M8 12h8" /><path d="M8 16h3" /><circle cx="18" cy="17" r="4" fill="#7AD63B" stroke="#0E1A2E" /><path d="M16.3 17l1.2 1.2 2.2-2.4" /></svg>Con escritura</div>
          </div>
          <div className="dato">
            <div className="big"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0E1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l14-6v14L3 13z" /><path d="M7 13v5h3v-4" /><path d="M20 9v6" /></svg>Mejor precio de lanzamiento</div>
          </div>
        </div>
      </section>

      <main className="seccion-form" id="inscripcion">
        <div className="wrap form-grid">
          <div className="anotate">
            <h2><span>Anotate</span> con anticipación</h2>
            <p>Registrá tu interés y accedé al mejor precio de lanzamiento antes de que abra la venta al público.</p>
            <ul className="beneficios">
              <li><Check />Prioridad para elegir tu lote</li>
              <li><Check />Precio y condiciones de preventa</li>
              <li><Check />Sin costo ni compromiso de compra</li>
            </ul>
          </div>
          <section className="card" aria-labelledby="form-title">
            <PreventaForm />
          </section>
        </div>
      </main>

      <footer className="pie">
        <div className="wrap pie-top">
          <div>
            <div className="marca">
              <Logo w={52} h={42} />
              <span><b>DE NUNZIO</b><small>NEGOCIOS INMOBILIARIOS</small></span>
            </div>
            <div className="mat">Matías De Nunzio · Martillero Público y Corredor Inmobiliario · Matrícula COL 7886</div>
          </div>
          <div className="tels">
            <small>SOLICITÁ INFORMACIÓN Y REGISTRÁ TU INTERÉS</small>
            <a className="tel" href={`https://wa.me/5491127424512?text=${WA_TEXTO}`} target="_blank" rel="noopener noreferrer"><WaIcon />11-2742-4512</a>
            <a className="tel" href={`https://wa.me/5491161365523?text=${WA_TEXTO}`} target="_blank" rel="noopener noreferrer"><WaIcon />11-6136-5523</a>
          </div>
        </div>
        <div className="aviso">TODAS LAS OPERACIONES SE REALIZAN POR INTERMEDIO DE INMOBILIARIA</div>
        <div className="wrap sellos">
          <div className="sello"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7AD63B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>Ubicación estratégica</div>
          <div className="sello"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7AD63B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V14" /><path d="M10 20V10" /><path d="M16 20V12" /><path d="M3 9l6-5 5 4 7-5" /></svg>Gran potencial de inversión</div>
          <div className="sello"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7AD63B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>Entorno seguro</div>
          <div className="sello"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7AD63B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" /><path d="M5 19l8-8" /></svg>Naturaleza y tranquilidad</div>
        </div>
      </footer>
    </div>
  );
}
