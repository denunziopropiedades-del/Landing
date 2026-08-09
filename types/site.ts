export type DistanciaAcceso = {
  destino: string;
  tiempo: string;
};

export type Beneficio = {
  icono: string;
  titulo: string;
};

export type Rol = "administrador" | "vendedor" | "supervisor";

export type Perfil = {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
};

export type Proyecto = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  ubicacion: string;
  ubicacionMapsUrl: string | null;
  metaDescripcion: string | null;
  imagenPortada: string | null;
  publicado: boolean;
  destacado: boolean;
  whatsappNumero: string | null;
  orden: number;
  celdaAnchoPct: number | null;
  celdaAltoPct: number | null;
};

export type EstadoLote = "disponible" | "reservado" | "vendido" | "no_disponible";

export type Lote = {
  id: string;
  proyectoId: string;
  nombre: string;
  manzana: string;
  numero: string;
  superficieM2: number;
  dimensiones: string;
  precioUsd: number;
  estado: EstadoLote;
  destacado: boolean;
  posX: number | null;
  posY: number | null;
  /** Plan de financiación fijo (anticipo + cuotas en USD). Si no está cargado, se usa la calculadora por porcentaje. */
  anticipoFinanciadoUsd: number | null;
  cuotasFinanciado: number | null;
  valorCuotaFinanciadoUsd: number | null;
};

/** Agrupación comercial de lotes por tipología (para las tarjetas de la landing). */
export type LoteTipo = {
  nombre: string;
  superficieM2: number;
  dimensiones: string;
  precioUsd: number;
  disponibles: number;
  destacado: boolean;
  anticipoFinanciadoUsd: number | null;
  cuotasFinanciado: number | null;
  valorCuotaFinanciadoUsd: number | null;
};

/** Precio por comprar 1, 2 o 3 lotes contiguos juntos en una misma operación. */
export type ComboLotes = {
  proyectoId: string;
  label1Lote: string;
  precio1LoteUsd: number | null;
  label2Lotes: string;
  precio2LotesUsd: number | null;
  label3Lotes: string;
  precio3LotesUsd: number | null;
  beneficio1: string | null;
  beneficio2: string | null;
  beneficio3: string | null;
};

export type Banner = {
  id: string;
  proyectoId: string | null;
  titulo: string;
  imagenUrl: string;
  linkUrl: string | null;
  activo: boolean;
};

export type Promocion = {
  id: string;
  proyectoId: string;
  activa: boolean;
  titulo: string;
  bajada: string;
  fechaFin: string;
};

export type ConfigFinanciacion = {
  anticipoMinimoPct: number;
  anticipoMaximoPct: number;
  cuotasOpciones: number[];
  interesAnualPct: number;
};

export type ItemGaleria = {
  id: string;
  proyectoId: string;
  categoria: "fotos" | "videos" | "drone" | "plano" | "masterplan";
  url: string;
  titulo: string;
};

export type ProgresoItem = {
  id: string;
  proyectoId: string;
  etapa: string;
  porcentaje: number;
};

export type Testimonio = {
  id: string;
  proyectoId: string | null;
  nombre: string;
  ubicacion: string;
  foto: string;
  comentario: string;
  estrellas: number;
};

export type FaqItem = {
  id: string;
  proyectoId: string | null;
  pregunta: string;
  respuesta: string;
};

export type SiteTextos = {
  heroTitulo: string;
  heroSubtitulo: string;
  whatsappNumero: string;
  whatsappMensajeDefault: string;
  telefonoOficina: string;
  email: string;
  instagram: string;
  facebook: string;
  youtube: string;
};

export type EstadoLead =
  | "nuevo"
  | "contactado"
  | "visita_programada"
  | "visita_realizada"
  | "reservado"
  | "pendiente_firma_escribania"
  | "firmado_escribania"
  | "vendido"
  | "descartado";

export type Lead = {
  id: string;
  creadoEn: string;
  actualizadoEn: string;
  tipo: "reserva" | "contacto" | "meta" | "manual" | "visita";
  proyectoId: string | null;
  proyectoNombre?: string;
  loteId: string | null;
  loteNombre?: string;
  loteNumero?: string;
  nombre: string;
  apellido?: string;
  dni?: string;
  email: string;
  telefono: string;
  mensaje?: string;
  manzana?: string;
  observaciones: string;
  estado: EstadoLead;
  asignadoA: string | null;
  asignadoNombre?: string;
  fechaNacimiento?: string | null;
  numeroTransaccion?: string | null;
  importeCobrado?: number | null;
  sexo?: "M" | "F" | null;
  fechaFirmaEscribania?: string | null;
  horarioFirmaEscribania?: string | null;
  comisionUsd?: number | null;
  honorariosUsd?: number | null;
  honorariosArs?: number | null;
  gastosArs?: number | null;
};

export type Gasto = {
  id: string;
  proyectoId: string | null;
  proyectoNombre?: string;
  fecha: string;
  concepto: string;
  categoria: string | null;
  montoArs: number;
  creadoEn: string;
};

export type EstadoVisita = "pendiente" | "confirmada" | "cancelada" | "realizada";

export type Visita = {
  id: string;
  creadoEn: string;
  leadId: string | null;
  proyectoId: string | null;
  proyectoNombre?: string;
  nombre: string;
  email: string;
  telefono: string;
  fecha: string;
  horario: string;
  estado: EstadoVisita;
  googleEventId: string | null;
};

export type ActividadLog = {
  id: string;
  creadoEn: string;
  usuarioEmail: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: Record<string, unknown> | null;
};
