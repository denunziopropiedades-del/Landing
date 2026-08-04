export type LoteTipo = {
  id: string;
  nombre: string;
  superficieM2: number;
  dimensiones: string;
  precioUsd: number;
  destacado?: boolean;
  disponibles?: number;
};

export type Beneficio = {
  icono: string;
  titulo: string;
};

export type DistanciaAcceso = {
  destino: string;
  tiempo: string;
};

export type ItemGaleria = {
  id: string;
  categoria: "fotos" | "videos" | "drone" | "plano" | "masterplan";
  url: string;
  titulo: string;
};

export type ProgresoItem = {
  etapa: string;
  porcentaje: number;
};

export type Testimonio = {
  id: string;
  nombre: string;
  ubicacion: string;
  foto: string;
  comentario: string;
  estrellas: number;
};

export type FaqItem = {
  pregunta: string;
  respuesta: string;
};

export type Promocion = {
  activa: boolean;
  titulo: string;
  bajada: string;
  fechaFin: string; // ISO date
};

export type ConfigFinanciacion = {
  anticipoMinimoPct: number;
  anticipoMaximoPct: number;
  cuotasOpciones: number[];
  interesAnualPct: number;
};

export type SiteTextos = {
  heroTitulo: string;
  heroSubtitulo: string;
  whatsappNumero: string;
  whatsappMensajeDefault: string;
  email: string;
  instagram: string;
  facebook: string;
  youtube: string;
};

export type Lead = {
  id: string;
  creadoEn: string;
  tipo: "reserva" | "contacto" | "visita";
  nombre: string;
  apellido?: string;
  dni?: string;
  email: string;
  telefono: string;
  mensaje?: string;
  manzana?: string;
  lote?: string;
  estado?: "nuevo" | "contactado" | "reservado" | "descartado";
};
