// Notas / guías del blog. Contenido pensado para posicionar en Google búsquedas locales
// ("inmobiliaria zona sur", "lotes en Guernica", "terreno en cuotas", etc.).
// Para sumar una nota nueva alcanza con agregar un objeto a NOTAS.

export type SeccionNota = { titulo: string; parrafos: string[]; lista?: string[] };
export type Nota = {
  slug: string;
  titulo: string;
  descripcion: string;
  fecha: string; // AAAA-MM-DD
  resumen: string;
  secciones: SeccionNota[];
  faqs?: { pregunta: string; respuesta: string }[];
  cta: { texto: string; href: string };
};

export const NOTAS: Nota[] = [
  {
    slug: "como-elegir-inmobiliaria-en-zona-sur",
    titulo: "Cómo elegir una inmobiliaria en Zona Sur: 7 cosas que tenés que revisar",
    descripcion:
      "Guía para elegir una inmobiliaria confiable en Zona Sur del GBA: matrícula del martillero, contratos, honorarios, documentación y atención.",
    fecha: "2026-11-24",
    resumen:
      "Comprar, vender o alquilar es una de las decisiones más importantes de tu vida. Antes de firmar nada, revisá estos puntos para saber si estás en buenas manos.",
    secciones: [
      {
        titulo: "1. Que haya un martillero matriculado a cargo",
        parrafos: [
          "En la provincia de Buenos Aires, la intermediación inmobiliaria la tiene que hacer un Martillero y Corredor Público colegiado. Pedí siempre el nombre y el número de matrícula, y verificá que figure en el Colegio de Martilleros del departamento judicial que corresponde.",
          "En De Nunzio Negocios Inmobiliarios cada operación está a cargo de Matías De Nunzio, Martillero y Corredor Público, matrícula COL 7886.",
        ],
      },
      {
        titulo: "2. Que conozca la zona en serio",
        parrafos: [
          "Zona Sur es enorme y cada localidad tiene su dinámica: no es lo mismo un lote en Guernica que una casa en San Vicente o un campo en Lobos. Una inmobiliaria que trabaja todos los días en la zona sabe qué barrios tienen servicios, cómo están los accesos, qué se vende rápido y a qué valor real.",
        ],
      },
      {
        titulo: "3. Honorarios claros y por escrito",
        parrafos: [
          "Los honorarios tienen que estar informados antes de empezar y quedar por escrito en la reserva o en la autorización de venta. Desconfiá de los costos que aparecen a último momento.",
        ],
      },
      {
        titulo: "4. Documentación revisada antes de que pongas un peso",
        parrafos: ["Una inmobiliaria profesional revisa antes de ofrecerte una propiedad:"],
        lista: [
          "Título de propiedad o situación dominial.",
          "Que el vendedor sea realmente el titular o tenga poder suficiente.",
          "Deudas de impuestos, tasas municipales y servicios.",
          "Plano y medidas del lote o de la construcción.",
        ],
      },
      {
        titulo: "5. Contratos y recibos por cada pago",
        parrafos: [
          "Cada seña, reserva o cuota tiene que tener su comprobante. Si comprás en cuotas, pedí el plan de pagos firmado y un lugar donde consultar lo que pagaste y lo que te falta.",
        ],
      },
      {
        titulo: "6. Atención real, no solo un aviso",
        parrafos: [
          "Que te respondan rápido, que puedas visitar la propiedad con turno y que alguien te acompañe hasta la escritura marca la diferencia. Preguntá cómo es el proceso completo, no solo el precio.",
        ],
      },
      {
        titulo: "7. Opiniones de otros clientes",
        parrafos: [
          "Buscá la inmobiliaria en Google Maps y leé las reseñas. También preguntá por operaciones parecidas a la tuya que hayan cerrado en la zona.",
        ],
      },
    ],
    faqs: [
      {
        pregunta: "¿En qué zonas trabaja De Nunzio Negocios Inmobiliarios?",
        respuesta:
          "Principalmente en San Vicente, Presidente Perón y Guernica, y también en Brandsen, General Paz, Cañuelas, Monte, Lobos, Roque Pérez, Saladillo, Magdalena, Punta Indio y el Gran La Plata.",
      },
      {
        pregunta: "¿Qué servicios ofrecen?",
        respuesta:
          "Venta de lotes, casas y campos, alquileres y administración de alquileres, tasaciones y desarrollos con lotes en cuotas.",
      },
    ],
    cta: { texto: "Hablá con nosotros", href: "/quienes-somos" },
  },
  {
    slug: "lotes-en-venta-en-guernica-guia",
    titulo: "Lotes en venta en Guernica: guía para comprar tu terreno",
    descripcion:
      "Todo lo que tenés que saber antes de comprar un lote en Guernica, Presidente Perón: ubicación, servicios, escritura, financiación en cuotas y visitas.",
    fecha: "2026-11-24",
    resumen:
      "Guernica se convirtió en una de las opciones más buscadas de Zona Sur para tener tu primer terreno. Te contamos qué mirar para comprar bien.",
    secciones: [
      {
        titulo: "Por qué Guernica",
        parrafos: [
          "Guernica, cabecera del partido de Presidente Perón, combina valores de lote más accesibles que otras zonas del conurbano con buena conexión por Ruta 210, el tren Roca y cercanía a San Vicente, Alejandro Korn y Canning.",
          "Para muchas familias es la forma de pasar de alquilar a tener algo propio, y para inversores es una zona con desarrollo en crecimiento.",
        ],
      },
      {
        titulo: "Qué revisar antes de comprar un lote",
        parrafos: ["Antes de reservar, chequeá:"],
        lista: [
          "Si el lote tiene escritura o qué tipo de boleto o cesión vas a firmar.",
          "Medidas y ubicación exacta dentro del barrio (manzana y lote).",
          "Servicios disponibles hoy y los que están proyectados: luz, agua, calles.",
          "Accesos, transporte y distancia a escuelas y comercios.",
          "Quién es el desarrollador y quién comercializa.",
        ],
      },
      {
        titulo: "Comprar en cuotas",
        parrafos: [
          "Muchos desarrollos de la zona ofrecen anticipo y cuotas fijas. Pedí siempre el plan de financiación por escrito, cómo se actualizan las cuotas y qué pasa si te atrasás.",
          "En nuestros desarrollos podés consultar tus cuotas y comprobantes online desde la web.",
        ],
      },
      {
        titulo: "Visitá el lote antes de decidir",
        parrafos: [
          "Nada reemplaza caminar el barrio. Agendá una visita con turno, conocé el entorno y hacé todas las preguntas en persona. Hacemos visitas todos los días.",
        ],
      },
    ],
    faqs: [
      {
        pregunta: "¿Se puede comprar un lote en Guernica en cuotas?",
        respuesta: "Sí. Según el desarrollo hay planes con anticipo y cuotas. Consultanos por las opciones vigentes.",
      },
      {
        pregunta: "¿Cómo agendo una visita?",
        respuesta: "Desde la sección Agendar visita de la web elegís día y horario, y te llega la confirmación por mail.",
      },
    ],
    cta: { texto: "Ver desarrollos y lotes disponibles", href: "/desarrollos" },
  },
  {
    slug: "comprar-terreno-en-cuotas-sin-riesgos",
    titulo: "Cómo comprar un terreno en cuotas sin riesgos",
    descripcion:
      "Consejos para comprar un lote en cuotas en Buenos Aires: qué contrato firmar, cómo se actualizan las cuotas, recibos, escritura y errores a evitar.",
    fecha: "2026-11-24",
    resumen:
      "Comprar un lote en cuotas es una gran forma de acceder a tu terreno sin tener todo el dinero junto. Para que salga bien, prestá atención a estos puntos.",
    secciones: [
      {
        titulo: "Entendé qué estás firmando",
        parrafos: [
          "Lo habitual es firmar una reserva y después un boleto de compraventa con el plan de pagos. Leé con calma: precio total, anticipo, cantidad de cuotas, forma de actualización, penalidades por atraso y cuándo se escritura.",
        ],
      },
      {
        titulo: "Cuotas fijas o actualizables",
        parrafos: [
          "Algunas cuotas son fijas en pesos, otras en dólares y otras se actualizan por un índice. Ninguna es mala por sí sola, pero tenés que saber de antemano cuánto vas a pagar y cómo puede cambiar.",
        ],
      },
      {
        titulo: "Guardá todos los comprobantes",
        parrafos: [
          "Cada pago tiene que tener su recibo. Lo ideal es tener un lugar donde consultar el historial de pagos y la próxima cuota, como el portal Mis cuotas de nuestra web.",
        ],
      },
      {
        titulo: "Errores comunes a evitar",
        parrafos: [],
        lista: [
          "Pagar sin ver el lote ni el plano.",
          "No preguntar cuándo y cómo se escritura.",
          "Comprometer una cuota que supera lo que podés pagar todos los meses.",
          "Comprar sin intervención de un martillero matriculado.",
        ],
      },
    ],
    cta: { texto: "Consultar lotes en cuotas", href: "/desarrollos" },
  },
  {
    slug: "escriturar-un-lote-en-provincia-de-buenos-aires",
    titulo: "Escriturar un lote en provincia de Buenos Aires: pasos y documentos",
    descripcion:
      "Cómo es el proceso de escritura de un terreno en provincia de Buenos Aires: boleto, certificados, escribano, gastos y qué documentación necesitás.",
    fecha: "2026-11-24",
    resumen:
      "La escritura es lo que te convierte en dueño. Te explicamos de forma simple cómo es el camino desde la reserva hasta la firma.",
    secciones: [
      {
        titulo: "1. Reserva y boleto",
        parrafos: [
          "Primero se reserva la propiedad y se firma el boleto de compraventa, donde quedan el precio, la forma de pago y el plazo para escriturar.",
        ],
      },
      {
        titulo: "2. Elección del escribano y certificados",
        parrafos: [
          "El escribano pide los certificados de dominio e inhibiciones al Registro de la Propiedad, y los libre deuda de impuestos y tasas. Así confirma que el vendedor puede vender y que la propiedad no tiene deudas ni embargos.",
        ],
      },
      {
        titulo: "3. Documentación que te van a pedir",
        parrafos: [],
        lista: [
          "DNI y CUIT/CUIL de compradores y vendedores.",
          "Estado civil (y datos del cónyuge si corresponde).",
          "Boleto de compraventa y comprobantes de pago.",
          "Origen de los fondos, según el monto de la operación.",
        ],
      },
      {
        titulo: "4. Firma y entrega",
        parrafos: [
          "El día de la firma se completa el pago, se firma la escritura y se entrega la posesión. Después el escribano inscribe la escritura en el Registro.",
        ],
      },
      {
        titulo: "¿Cuánto cuesta escriturar?",
        parrafos: [
          "Los gastos dependen del valor de la propiedad e incluyen honorarios del escribano, impuestos y sellados. Pedí un presupuesto al escribano antes de la firma para no tener sorpresas.",
        ],
      },
    ],
    cta: { texto: "Consultanos por tu operación", href: "/comprar" },
  },
  {
    slug: "alquilar-mi-casa-con-administracion",
    titulo: "Cómo alquilar tu casa en Zona Sur sin dolores de cabeza",
    descripcion:
      "Ventajas de alquilar tu propiedad con una inmobiliaria: tasación, selección de inquilinos, contrato, cobro mensual y liquidación al propietario.",
    fecha: "2026-11-24",
    resumen:
      "Tener una propiedad en alquiler puede ser una buena renta o un problema. La diferencia está en cómo se administra.",
    secciones: [
      {
        titulo: "Poné el precio correcto",
        parrafos: [
          "Un alquiler caro queda vacío meses; uno barato te hace perder plata. Una tasación profesional te dice el valor real de mercado en tu zona.",
        ],
      },
      {
        titulo: "Elegí bien al inquilino",
        parrafos: [
          "La selección del inquilino es la parte más importante: ingresos demostrables, garantías y referencias. Eso evita la mayoría de los problemas.",
        ],
      },
      {
        titulo: "Contrato claro",
        parrafos: [
          "El contrato tiene que dejar claros plazo, precio, forma de ajuste, quién paga servicios y expensas, y el estado de la propiedad al entregarla.",
        ],
      },
      {
        titulo: "Administración mensual",
        parrafos: ["Con la administración de alquileres nos encargamos de:"],
        lista: [
          "Cobrar el alquiler todos los meses.",
          "Aplicar los ajustes acordados.",
          "Controlar servicios e impuestos.",
          "Liquidarte lo cobrado con un comprobante.",
          "Que inquilino y propietario vean el historial de pagos online.",
        ],
      },
    ],
    cta: { texto: "Quiero alquilar mi propiedad", href: "/propietarios" },
  },
  {
    slug: "cuanto-vale-mi-propiedad-tasacion",
    titulo: "¿Cuánto vale mi propiedad? Así se hace una tasación profesional",
    descripcion:
      "Cómo se calcula el valor de una casa, lote o campo en Zona Sur: comparables, ubicación, superficie, estado y documentación. Pedí tu tasación.",
    fecha: "2026-11-24",
    resumen:
      "Saber cuánto vale tu propiedad es el primer paso para venderla o alquilarla bien. Te contamos qué tiene en cuenta un martillero al tasar.",
    secciones: [
      {
        titulo: "Comparables de la zona",
        parrafos: [
          "La base de una tasación son las propiedades parecidas que se publican y se venden en la misma zona. No alcanza con mirar avisos: hay que saber a qué valor se cierran realmente las operaciones.",
        ],
      },
      {
        titulo: "Qué factores suben o bajan el valor",
        parrafos: [],
        lista: [
          "Ubicación, accesos y servicios.",
          "Superficie del terreno y metros cubiertos.",
          "Estado, antigüedad y calidad de construcción.",
          "Situación de la documentación (escritura, planos aprobados).",
          "Demanda actual en la zona.",
        ],
      },
      {
        titulo: "Tasación online y tasación profesional",
        parrafos: [
          "Con nuestro tasador online tenés un rango estimado en pocos minutos. Para vender o alquilar, lo recomendable es una tasación profesional con visita e informe firmado por un martillero matriculado.",
        ],
      },
    ],
    cta: { texto: "Usar el tasador online", href: "/tasador" },
  },
];

export function getNota(slug: string) {
  return NOTAS.find((n) => n.slug === slug);
}
