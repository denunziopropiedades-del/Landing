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
  /** Datos de la escribanía asignada a este proyecto, para el mail de firma al cliente. */
  escribaniaNombre?: string | null;
  escribaniaDireccion?: string | null;
  escribaniaMapsUrl?: string | null;
  escribaniaInstrucciones?: string | null;
  /** Documentación que hay que llevar a la firma, específica de este proyecto. */
  documentosRequeridos?: string[];
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

export type PlanFinanciacionFijo = {
  anticipoUsd: number;
  cuotas: number;
  valorCuotaUsd: number;
};

export type ConfigFinanciacion = {
  anticipoMinimoPct: number;
  anticipoMaximoPct: number;
  cuotasOpciones: number[];
  interesAnualPct: number;
  /** Hasta 3 planes de financiación a monto fijo en USD (ej. "anticipo $X, 6 cuotas
   * de $Y"), independientes del simulador por porcentaje de arriba. */
  planesFijos: PlanFinanciacionFijo[];
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
  | "pago_confirmado"
  | "pendiente_firma_escribania"
  | "firmado_escribania"
  | "vendido"
  | "descartado";

/** Datos resumidos de un lote vinculado a un lead, para operaciones de 1 a 3 lotes. */
export type LoteDeLead = {
  id: string;
  manzana: string;
  numero: string;
  superficieM2: number;
  nombre: string;
};

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
  /** Todos los lotes de la operación (1 a 3). Para leads viejos de un solo lote, tiene 1 elemento. */
  lotes: LoteDeLead[];
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
  pagoConfirmadoEn?: string | null;
  pagoMercadopagoId?: string | null;
  /** Documentación (del listado requerido del proyecto) que este cliente ya entregó. */
  documentosEntregados?: string[];
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
