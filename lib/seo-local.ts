/**
 * Textos de SEO local por partido: lo que la gente busca en Google
 * ("inmobiliaria en San Vicente", "alquiler en Guernica", "lotes en venta en Brandsen").
 */
export type InfoLocal = {
  /** Localidades y barrios que la gente usa al buscar. */
  localidades: string[];
  /** Párrafo propio de cada partido (contenido único por página). */
  intro: string;
  /** Qué se busca más en ese partido, en orden. */
  foco: ("alquiler" | "venta" | "lotes" | "campos")[];
};

export const INFO_LOCAL: Record<string, InfoLocal> = {
  "la-plata": {
    localidades: ["La Plata", "City Bell", "Gonnet", "Villa Elisa", "Tolosa", "Los Hornos", "Gorina"],
    intro:
      "La Plata concentra la mayor demanda de alquileres de la región: estudiantes, familias y profesionales buscan departamentos en el casco urbano y casas en City Bell, Gonnet y Villa Elisa. Te ayudamos a alquilar, comprar o vender con tasación profesional y acompañamiento hasta la firma.",
    foco: ["alquiler", "venta"],
  },
  berisso: {
    localidades: ["Berisso", "Villa Zula", "Los Talas"],
    intro:
      "Berisso combina barrios tradicionales cerca de La Plata con zonas verdes hacia el río. Casas, departamentos y terrenos en venta y alquiler, con atención personalizada de un Martillero Público colegiado.",
    foco: ["alquiler", "venta"],
  },
  ensenada: {
    localidades: ["Ensenada", "Punta Lara", "El Dique"],
    intro:
      "Ensenada y Punta Lara suman propiedades cerca del río y a minutos de La Plata. Casas, departamentos y terrenos para vivir o invertir, en venta y alquiler.",
    foco: ["venta", "alquiler"],
  },
  "presidente-peron": {
    localidades: ["Guernica", "Presidente Perón"],
    intro:
      "Guernica es una de las zonas de mayor crecimiento del sur del Gran Buenos Aires. Ofrecemos lotes con escritura y financiación propia en cuotas, casas y alquileres, con visitas guiadas a los barrios todos los días.",
    foco: ["lotes", "venta", "alquiler"],
  },
  "san-vicente": {
    localidades: ["San Vicente", "Alejandro Korn", "Domselaar"],
    intro:
      "San Vicente, Alejandro Korn y Domselaar ofrecen vida tranquila con verde y buenos accesos. Lotes en cuotas, casas, quintas y chacras en venta y alquiler, con escritura y asesoramiento en cada paso.",
    foco: ["lotes", "venta", "alquiler", "campos"],
  },
  brandsen: {
    localidades: ["Brandsen", "Jeppener", "Gómez"],
    intro:
      "Brandsen es elegido por quienes buscan casa con terreno, quinta o chacra a un paso de La Plata y del Gran Buenos Aires. Propiedades rurales y urbanas en venta y alquiler.",
    foco: ["venta", "campos", "alquiler"],
  },
  "general-paz": {
    localidades: ["Ranchos", "Loma Verde", "Villanueva"],
    intro:
      "General Paz (Ranchos) es zona de campos, chacras y casas de pueblo. Tasamos y comercializamos campos y propiedades rurales y urbanas en venta y arrendamiento.",
    foco: ["campos", "venta"],
  },
  canuelas: {
    localidades: ["Cañuelas", "Máximo Paz", "Alejandro Petión", "Uribelarrea"],
    intro:
      "Cañuelas une barrios en crecimiento, chacras y campos sobre la Ruta 3 y la Ruta 205. Lotes, casas, quintas y campos en venta y alquiler.",
    foco: ["venta", "campos", "lotes"],
  },
  monte: {
    localidades: ["San Miguel del Monte", "Monte"],
    intro:
      "San Miguel del Monte, con su laguna y su entorno rural, es ideal para casas de fin de semana, quintas y campos. Propiedades en venta y alquiler con asesoramiento profesional.",
    foco: ["campos", "venta"],
  },
  lobos: {
    localidades: ["Lobos", "Salvador María", "Empalme Lobos"],
    intro:
      "Lobos ofrece campos, chacras, quintas y casas en una de las zonas rurales más buscadas de la provincia. Tasación y venta de campos y propiedades.",
    foco: ["campos", "venta"],
  },
  "roque-perez": {
    localidades: ["Roque Pérez"],
    intro:
      "Roque Pérez es zona agrícola-ganadera con campos productivos y casas de pueblo. Comercializamos campos en venta y arrendamiento y propiedades urbanas.",
    foco: ["campos", "venta"],
  },
  saladillo: {
    localidades: ["Saladillo", "Del Carril", "Cazón"],
    intro:
      "Saladillo combina campos productivos con una ciudad con todos los servicios. Campos, chacras y casas en venta y alquiler, con tasación profesional.",
    foco: ["campos", "venta"],
  },
  magdalena: {
    localidades: ["Magdalena", "Atalaya", "Vieytes"],
    intro:
      "Magdalena, sobre la costa del Río de la Plata, ofrece campos, chacras y casas de pueblo. Propiedades rurales y urbanas en venta y arrendamiento.",
    foco: ["campos", "venta"],
  },
  "punta-indio": {
    localidades: ["Verónica", "Punta Indio", "Pipinas"],
    intro:
      "Punta Indio y Verónica suman costa de río, campos y casas de descanso. Campos, chacras y propiedades en venta y alquiler con asesoramiento local.",
    foco: ["campos", "venta"],
  },
};

const ETIQUETA_FOCO = {
  alquiler: "casas y departamentos en alquiler",
  venta: "casas y terrenos en venta",
  lotes: "lotes en cuotas con escritura",
  campos: "campos y chacras",
} as const;

/** Nombre como lo busca la gente: "Guernica (Presidente Perón)", "Ranchos (General Paz)". */
export function nombreBuscado(nombre: string, info: InfoLocal) {
  const principal = info.localidades[0];
  return principal && principal !== nombre ? `${principal} (${nombre})` : nombre;
}

export function tituloLocal(nombre: string, info: InfoLocal) {
  return `Inmobiliaria en ${nombreBuscado(nombre, info)}: ${ETIQUETA_FOCO[info.foco[0]]}`;
}

export function descripcionLocal(nombre: string, info: InfoLocal) {
  return `Inmobiliaria en ${nombre} (${info.localidades.slice(0, 3).join(", ")}): ${info.foco
    .map((f) => ETIQUETA_FOCO[f])
    .join(", ")}. Tasaciones y administración de alquileres. Martillero Público colegiado.`;
}

/** Preguntas frecuentes por localidad (también van como datos estructurados para Google). */
export function faqsLocales(nombre: string) {
  return [
    {
      pregunta: `¿Cómo alquilo mi casa o departamento en ${nombre}?`,
      respuesta: `Te hacemos una tasación sin cargo del valor de alquiler, publicamos la propiedad, seleccionamos inquilinos con garantía y nos ocupamos del contrato, el cobro mensual y la liquidación al propietario.`,
    },
    {
      pregunta: `¿Cuánto vale mi propiedad en ${nombre}?`,
      respuesta: `Hacemos tasaciones profesionales según zona, estado y operaciones comparables reales. Pedila desde esta página y te contactamos.`,
    },
    {
      pregunta: `¿Hay lotes en cuotas en ${nombre}?`,
      respuesta: `Tenemos desarrollos con lotes con escritura y financiación propia en cuotas en la zona sur. Consultá disponibilidad o agendá una visita guiada.`,
    },
  ];
}
