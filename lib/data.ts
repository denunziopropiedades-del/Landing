import type {
  Beneficio,
  ConfigFinanciacion,
  DistanciaAcceso,
  FaqItem,
  ItemGaleria,
  LoteTipo,
  ProgresoItem,
  Promocion,
  SiteTextos,
  Testimonio,
} from "@/types/site";

/**
 * Contenido semilla ("seed data") del sitio.
 *
 * Esto funciona como fuente de datos por defecto cuando Supabase no está
 * configurado (o mientras se carga), y como esquema de referencia para el
 * panel de administración. Ver lib/supabase.ts para el mecanismo de
 * fallback.
 */

export const siteTextos: SiteTextos = {
  heroTitulo: "Invertí hoy en tu lote en Ayres de Guernica",
  heroSubtitulo:
    "Lotes con escritura garantizada en una de las zonas con mayor crecimiento del sur del Gran Buenos Aires.",
  whatsappNumero: "5491100000000",
  whatsappMensajeDefault: "Hola Matías. Me interesa recibir información sobre Ayres de Guernica.",
  email: "info@ayresdeguernica.com.ar",
  instagram: "https://instagram.com/ayresdeguernica",
  facebook: "https://facebook.com/ayresdeguernica",
  youtube: "https://youtube.com/@ayresdeguernica",
};

export const promocion: Promocion = {
  activa: true,
  titulo: "¡Últimos días con estos precios!",
  bajada: "Promoción especial por tiempo limitado.",
  fechaFin: "2026-08-31T23:59:59-03:00",
};

export const lotes: LoteTipo[] = [
  {
    id: "lote-300",
    nombre: "Lote 300 m²",
    superficieM2: 300,
    dimensiones: "10 x 30",
    precioUsd: 2700,
    disponibles: 18,
  },
  {
    id: "lote-600",
    nombre: "Lote 600 m²",
    superficieM2: 600,
    dimensiones: "20 x 30",
    precioUsd: 5400,
    destacado: true,
    disponibles: 9,
  },
  {
    id: "lote-900",
    nombre: "Lote 900 m²",
    superficieM2: 900,
    dimensiones: "30 x 30",
    precioUsd: 8100,
    disponibles: 4,
  },
];

export const beneficios: Beneficio[] = [
  { icono: "FileCheck2", titulo: "Escritura garantizada" },
  { icono: "ShieldCheck", titulo: "Barrio perimetrado" },
  { icono: "TrendingUp", titulo: "Excelente inversión" },
  { icono: "Road", titulo: "Calles mejoradas" },
  { icono: "LineChart", titulo: "Gran potencial de valorización" },
  { icono: "Signpost", titulo: "Excelente acceso" },
  { icono: "Building2", titulo: "Desarrollo en crecimiento" },
  { icono: "Users", titulo: "Atención personalizada" },
];

export const accesos: DistanciaAcceso[] = [
  { destino: "CABA", tiempo: "50 min" },
  { destino: "San Vicente", tiempo: "15 min" },
  { destino: "Canning", tiempo: "20 min" },
  { destino: "Presidente Perón", tiempo: "10 min" },
  { destino: "Ruta 210", tiempo: "5 min" },
];

export const galeria: ItemGaleria[] = [
  {
    id: "foto-1",
    categoria: "fotos",
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop",
    titulo: "Vista del barrio",
  },
  {
    id: "foto-2",
    categoria: "fotos",
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop&sat=-100",
    titulo: "Calles internas",
  },
  {
    id: "foto-3",
    categoria: "fotos",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop",
    titulo: "Entorno natural",
  },
  {
    id: "drone-1",
    categoria: "drone",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop",
    titulo: "Toma aérea general",
  },
  {
    id: "drone-2",
    categoria: "drone",
    url: "https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?q=80&w=1600&auto=format&fit=crop",
    titulo: "Toma aérea del acceso",
  },
  {
    id: "video-1",
    categoria: "videos",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    titulo: "Recorrido por el barrio",
  },
  {
    id: "plano-1",
    categoria: "plano",
    url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
    titulo: "Plano del barrio",
  },
  {
    id: "masterplan-1",
    categoria: "masterplan",
    url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop",
    titulo: "Masterplan Etapa 2",
  },
];

export const progreso: ProgresoItem[] = [
  { etapa: "Calles", porcentaje: 90 },
  { etapa: "Alumbrado", porcentaje: 70 },
  { etapa: "Cerco perimetral", porcentaje: 100 },
  { etapa: "Portal de ingreso", porcentaje: 60 },
  { etapa: "Obras", porcentaje: 75 },
  { etapa: "Lotes entregados", porcentaje: 40 },
];

export const configFinanciacion: ConfigFinanciacion = {
  anticipoMinimoPct: 20,
  anticipoMaximoPct: 50,
  cuotasOpciones: [12, 24, 36, 48, 60],
  interesAnualPct: 6,
};

export const testimonios: Testimonio[] = [
  {
    id: "t1",
    nombre: "Marcela Ibáñez",
    ubicacion: "Guernica, Buenos Aires",
    foto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
    comentario:
      "Compramos nuestro lote hace un año y la atención fue excelente desde el primer momento. Todo con la documentación en regla.",
    estrellas: 5,
  },
  {
    id: "t2",
    nombre: "Julián Torres",
    ubicacion: "San Vicente, Buenos Aires",
    foto: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300&auto=format&fit=crop",
    comentario:
      "Invertimos pensando en el futuro y la valorización de la zona ya se está notando. Muy conformes con el desarrollo.",
    estrellas: 5,
  },
  {
    id: "t3",
    nombre: "Carla Domínguez",
    ubicacion: "Canning, Buenos Aires",
    foto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop",
    comentario:
      "La financiación se adaptó perfectamente a lo que necesitábamos. Recomiendo Ayres de Guernica sin dudarlo.",
    estrellas: 5,
  },
];

export const faqs: FaqItem[] = [
  {
    pregunta: "¿Tiene escritura?",
    respuesta:
      "Sí, todos los lotes de Ayres de Guernica se entregan con escritura garantizada, brindando plena seguridad jurídica a la inversión.",
  },
  {
    pregunta: "¿Cuándo se entrega la posesión?",
    respuesta:
      "La posesión se entrega una vez formalizada la firma del boleto y según el plan de pagos acordado. Nuestro equipo comercial te brinda el detalle exacto según el lote elegido.",
  },
  {
    pregunta: "¿Cómo es la financiación?",
    respuesta:
      "Ofrecemos planes de financiación propia con anticipo y cuotas fijas en dólares o su equivalente en pesos. Usá la calculadora de la web para simular tu plan o consultanos por WhatsApp.",
  },
  {
    pregunta: "¿Puedo visitar el proyecto?",
    respuesta:
      "Sí, coordinamos visitas guiadas al desarrollo todos los días. Podés agendar tu visita desde la sección de contacto o directamente por WhatsApp.",
  },
  {
    pregunta: "¿Cómo se reserva?",
    respuesta:
      "Podés reservar tu lote online completando el formulario de reserva, seleccionando manzana y lote, y abonando la seña correspondiente. También podés hacerlo con nuestro equipo comercial vía WhatsApp.",
  },
];

export const manzanas = ["A", "B", "C", "D", "E", "F"];

export const estadisticasDemo = {
  visitasUltimos30Dias: 4820,
  consultasWhatsapp: 312,
  reservasActivas: 27,
  loteMasConsultado: "Lote 600 m²",
};
