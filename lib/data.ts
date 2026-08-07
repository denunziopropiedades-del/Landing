import type {
  Banner,
  ConfigFinanciacion,
  FaqItem,
  ItemGaleria,
  Lote,
  Proyecto,
  Promocion,
  ProgresoItem,
  SiteTextos,
  Testimonio,
} from "@/types/site";

/**
 * Contenido semilla ("seed data") de la plataforma.
 *
 * Funciona como fuente de datos por defecto cuando Supabase no está
 * configurado (o mientras se carga), y como esquema de referencia para el
 * panel de administración. Representa el proyecto insignia "Ayres de
 * Guernica" para que el sitio se vea completo en desarrollo. Ver
 * lib/content.ts para el mecanismo de fallback.
 */

export const PROYECTO_DEMO_ID = "demo-ayres-de-guernica";

export const siteTextosSeed: SiteTextos = {
  heroTitulo: "Encontrá el lote ideal para tu inversión",
  heroSubtitulo:
    "Desarrollos inmobiliarios con escritura garantizada en las zonas de mayor crecimiento del Gran Buenos Aires.",
  whatsappNumero: "5491127424512",
  whatsappMensajeDefault: "Hola, me interesa recibir información.",
  telefonoOficina: "11-6136-5523",
  email: "denunziopropiedades@gmail.com",
  instagram: "https://instagram.com/matulotes",
  facebook: "https://facebook.com/matulotes",
  youtube: "https://youtube.com/@matulotes",
};

export const proyectoSeed: Proyecto = {
  id: PROYECTO_DEMO_ID,
  nombre: "Ayres de Guernica",
  slug: "ayres-de-guernica",
  descripcion:
    "Lotes con escritura garantizada en una de las zonas con mayor crecimiento del sur del Gran Buenos Aires.",
  ubicacion: "Guernica, Buenos Aires",
  ubicacionMapsUrl: "https://maps.app.goo.gl/AKTSkF2C1qaHGH4q6",
  imagenPortada:
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2400&auto=format&fit=crop",
  publicado: true,
  destacado: true,
  whatsappNumero: "5491127424512",
  orden: 0,
};

export const lotesSeed: Lote[] = [
  { id: "demo-lote-a1", proyectoId: PROYECTO_DEMO_ID, nombre: "Lote 300 m²", manzana: "A", numero: "1", superficieM2: 300, dimensiones: "10 x 30", precioUsd: 2700, estado: "disponible", destacado: false, posX: 12, posY: 20, anticipoFinanciadoUsd: 1700, cuotasFinanciado: 18, valorCuotaFinanciadoUsd: 250 },
  { id: "demo-lote-a2", proyectoId: PROYECTO_DEMO_ID, nombre: "Lote 300 m²", manzana: "A", numero: "2", superficieM2: 300, dimensiones: "10 x 30", precioUsd: 2700, estado: "disponible", destacado: false, posX: 22, posY: 20, anticipoFinanciadoUsd: 1700, cuotasFinanciado: 18, valorCuotaFinanciadoUsd: 250 },
  { id: "demo-lote-a3", proyectoId: PROYECTO_DEMO_ID, nombre: "Lote 300 m²", manzana: "A", numero: "3", superficieM2: 300, dimensiones: "10 x 30", precioUsd: 2700, estado: "reservado", destacado: false, posX: 32, posY: 20, anticipoFinanciadoUsd: 1700, cuotasFinanciado: 18, valorCuotaFinanciadoUsd: 250 },
  { id: "demo-lote-b1", proyectoId: PROYECTO_DEMO_ID, nombre: "Lote 600 m²", manzana: "B", numero: "1", superficieM2: 600, dimensiones: "20 x 30", precioUsd: 5400, estado: "disponible", destacado: true, posX: 12, posY: 45, anticipoFinanciadoUsd: 4400, cuotasFinanciado: 18, valorCuotaFinanciadoUsd: 250 },
  { id: "demo-lote-b2", proyectoId: PROYECTO_DEMO_ID, nombre: "Lote 600 m²", manzana: "B", numero: "2", superficieM2: 600, dimensiones: "20 x 30", precioUsd: 5400, estado: "vendido", destacado: true, posX: 27, posY: 45, anticipoFinanciadoUsd: 4400, cuotasFinanciado: 18, valorCuotaFinanciadoUsd: 250 },
  { id: "demo-lote-c1", proyectoId: PROYECTO_DEMO_ID, nombre: "Lote 900 m²", manzana: "C", numero: "1", superficieM2: 900, dimensiones: "30 x 30", precioUsd: 8100, estado: "disponible", destacado: false, posX: 15, posY: 70, anticipoFinanciadoUsd: null, cuotasFinanciado: null, valorCuotaFinanciadoUsd: null },
  { id: "demo-lote-c2", proyectoId: PROYECTO_DEMO_ID, nombre: "Lote 900 m²", manzana: "C", numero: "2", superficieM2: 900, dimensiones: "30 x 30", precioUsd: 8100, estado: "no_disponible", destacado: false, posX: 35, posY: 70, anticipoFinanciadoUsd: null, cuotasFinanciado: null, valorCuotaFinanciadoUsd: null },
];

export const bannersSeed: Banner[] = [];

export const promocionesSeed: Promocion[] = [
  {
    id: "demo-promo-1",
    proyectoId: PROYECTO_DEMO_ID,
    activa: true,
    titulo: "¡Últimos días con estos precios!",
    bajada: "Promoción especial por tiempo limitado.",
    fechaFin: "2026-08-31T23:59:59-03:00",
  },
];

export const configFinanciacionSeed: ConfigFinanciacion = {
  anticipoMinimoPct: 20,
  anticipoMaximoPct: 50,
  cuotasOpciones: [12, 24, 36, 48, 60],
  interesAnualPct: 6,
};

export const galeriaSeed: ItemGaleria[] = [
  { id: "demo-foto-1", proyectoId: PROYECTO_DEMO_ID, categoria: "fotos", url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop", titulo: "Vista del barrio" },
  { id: "demo-foto-2", proyectoId: PROYECTO_DEMO_ID, categoria: "fotos", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop", titulo: "Entorno natural" },
  { id: "demo-drone-1", proyectoId: PROYECTO_DEMO_ID, categoria: "drone", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop", titulo: "Toma aérea general" },
  { id: "demo-drone-2", proyectoId: PROYECTO_DEMO_ID, categoria: "drone", url: "https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?q=80&w=1600&auto=format&fit=crop", titulo: "Toma aérea del acceso" },
  { id: "demo-video-1", proyectoId: PROYECTO_DEMO_ID, categoria: "videos", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", titulo: "Recorrido por el barrio" },
  { id: "demo-plano-1", proyectoId: PROYECTO_DEMO_ID, categoria: "plano", url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop", titulo: "Plano del barrio" },
  { id: "demo-masterplan-1", proyectoId: PROYECTO_DEMO_ID, categoria: "masterplan", url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop", titulo: "Masterplan" },
];

export const progresoSeed: ProgresoItem[] = [
  { id: "demo-p1", proyectoId: PROYECTO_DEMO_ID, etapa: "Calles", porcentaje: 90 },
  { id: "demo-p2", proyectoId: PROYECTO_DEMO_ID, etapa: "Alumbrado", porcentaje: 70 },
  { id: "demo-p3", proyectoId: PROYECTO_DEMO_ID, etapa: "Cerco perimetral", porcentaje: 100 },
  { id: "demo-p4", proyectoId: PROYECTO_DEMO_ID, etapa: "Portal de ingreso", porcentaje: 60 },
  { id: "demo-p5", proyectoId: PROYECTO_DEMO_ID, etapa: "Obras", porcentaje: 75 },
  { id: "demo-p6", proyectoId: PROYECTO_DEMO_ID, etapa: "Lotes entregados", porcentaje: 40 },
];

export const testimoniosSeed: Testimonio[] = [
  {
    id: "demo-t1",
    proyectoId: null,
    nombre: "Marcela Ibáñez",
    ubicacion: "Guernica, Buenos Aires",
    foto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
    comentario:
      "Compramos nuestro lote hace un año y la atención fue excelente desde el primer momento. Todo con la documentación en regla.",
    estrellas: 5,
  },
  {
    id: "demo-t2",
    proyectoId: null,
    nombre: "Julián Torres",
    ubicacion: "San Vicente, Buenos Aires",
    foto: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300&auto=format&fit=crop",
    comentario:
      "Invertimos pensando en el futuro y la valorización de la zona ya se está notando. Muy conformes con el desarrollo.",
    estrellas: 5,
  },
  {
    id: "demo-t3",
    proyectoId: null,
    nombre: "Carla Domínguez",
    ubicacion: "Canning, Buenos Aires",
    foto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop",
    comentario:
      "La financiación se adaptó perfectamente a lo que necesitábamos. Recomiendo la empresa sin dudarlo.",
    estrellas: 5,
  },
];

export const faqsSeed: FaqItem[] = [
  {
    id: "demo-f1",
    proyectoId: null,
    pregunta: "¿Tiene escritura?",
    respuesta:
      "Sí, todos nuestros lotes se entregan con escritura garantizada, brindando plena seguridad jurídica a la inversión.",
  },
  {
    id: "demo-f2",
    proyectoId: null,
    pregunta: "¿Cómo es la financiación?",
    respuesta:
      "Ofrecemos planes de financiación propia con anticipo y cuotas fijas. Usá la calculadora de cada proyecto para simular tu plan.",
  },
  {
    id: "demo-f3",
    proyectoId: null,
    pregunta: "¿Puedo visitar el proyecto?",
    respuesta:
      "Sí, coordinamos visitas guiadas todos los días. Podés agendar tu visita desde la web o directamente por WhatsApp.",
  },
  {
    id: "demo-f4",
    proyectoId: null,
    pregunta: "¿Cómo se reserva un lote?",
    respuesta:
      "Podés reservar online seleccionando manzana y lote, o coordinar con nuestro equipo comercial vía WhatsApp.",
  },
];

export const beneficios = [
  { icono: "FileCheck2", titulo: "Escritura garantizada" },
  { icono: "ShieldCheck", titulo: "Barrio perimetrado" },
  { icono: "TrendingUp", titulo: "Excelente inversión" },
  { icono: "Road", titulo: "Calles mejoradas" },
  { icono: "LineChart", titulo: "Gran potencial de valorización" },
  { icono: "Signpost", titulo: "Excelente acceso" },
  { icono: "Building2", titulo: "Desarrollo en crecimiento" },
  { icono: "Users", titulo: "Atención personalizada" },
];

export const accesos = [
  { destino: "CABA", tiempo: "50 min" },
  { destino: "San Vicente", tiempo: "15 min" },
  { destino: "Canning", tiempo: "20 min" },
  { destino: "Presidente Perón", tiempo: "10 min" },
  { destino: "Ruta 210", tiempo: "5 min" },
];

export const estadisticasDemo = {
  visitasUltimos30Dias: 4820,
  consultasWhatsapp: 312,
  reservasActivas: 27,
  loteMasConsultado: "Lote 600 m²",
};
