import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAdminCandidatosActual } from "@/lib/candidatos/auth";
import { getCandidatos } from "@/lib/candidatos/data";
import { CARGO_LABEL, DISPONIBILIDAD_LABEL, ESTADO_LABEL } from "@/lib/candidatos/constants";
import type { Cargo, DisponibilidadInicio, EstadoCandidato, FiltrosCandidatos } from "@/types/candidatos";

function str(v: string | null) {
  return v && v.length > 0 ? v : undefined;
}

function num(v: string | null) {
  const s = str(v);
  return s ? Number(s) : undefined;
}

export async function GET(request: Request) {
  const admin = await getAdminCandidatosActual();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams: sp } = new URL(request.url);

  const filtros: FiltrosCandidatos = {
    busqueda: str(sp.get("busqueda")),
    cargo: str(sp.get("cargo")) as Cargo | undefined,
    localidad: str(sp.get("localidad")),
    especialidad: str(sp.get("especialidad")),
    experienciaMinima: num(sp.get("experienciaMin")),
    pretensionMin: num(sp.get("pretensionMin")),
    pretensionMax: num(sp.get("pretensionMax")),
    disponibilidad: str(sp.get("disponibilidad")) as DisponibilidadInicio | undefined,
    experienciaComprobable: sp.get("experienciaComprobable") === "si" ? true : undefined,
    herramientasPropias: sp.get("herramientas") === "si" ? true : undefined,
    movilidadPropia: sp.get("movilidad") === "si" ? true : undefined,
    estado: str(sp.get("estado")) as EstadoCandidato | undefined,
    orden: (str(sp.get("orden")) as FiltrosCandidatos["orden"]) ?? "recientes",
  };

  const candidatos = await getCandidatos(filtros);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Selección de personal";
  workbook.created = new Date();

  const hoja = workbook.addWorksheet("Candidatos");
  hoja.columns = [
    { header: "Nombre y apellido", key: "nombre", width: 26 },
    { header: "DNI", key: "dni", width: 14 },
    { header: "Teléfono", key: "telefono", width: 16 },
    { header: "Localidad", key: "localidad", width: 18 },
    { header: "Edad", key: "edad", width: 8 },
    { header: "Cargo", key: "cargo", width: 20 },
    { header: "Años de experiencia", key: "experiencia", width: 10 },
    { header: "Especialidad", key: "especialidad", width: 24 },
    { header: "Trabajos que sabe realizar", key: "trabajos", width: 32 },
    { header: "Experiencia comprobable", key: "expComprobable", width: 12 },
    { header: "Referencias laborales", key: "referencias", width: 28 },
    { header: "Disponibilidad para comenzar", key: "dispInicio", width: 16 },
    { header: "Disponibilidad horaria", key: "dispHoraria", width: 20 },
    { header: "Pretensión salarial diaria", key: "pretension", width: 14 },
    { header: "Última remuneración diaria", key: "ultimaRemuneracion", width: 14 },
    { header: "Acepta jornada", key: "aceptaJornada", width: 10 },
    { header: "Acepta obra", key: "aceptaObra", width: 10 },
    { header: "Herramientas propias", key: "herramientas", width: 12 },
    { header: "Movilidad propia", key: "movilidad", width: 12 },
    { header: "Puntaje", key: "puntaje", width: 10 },
    { header: "Clasificación", key: "clasificacion", width: 18 },
    { header: "Estado", key: "estado", width: 16 },
    { header: "Observaciones", key: "observaciones", width: 32 },
    { header: "Fecha de alta", key: "fecha", width: 18 },
  ];
  hoja.getRow(1).font = { bold: true };

  candidatos.forEach((c) =>
    hoja.addRow({
      nombre: c.nombreApellido,
      dni: c.dni,
      telefono: c.telefono,
      localidad: c.localidad ?? "",
      edad: c.edad ?? "",
      cargo: CARGO_LABEL[c.cargo],
      experiencia: c.anosExperiencia,
      especialidad: c.especialidad ?? "",
      trabajos: c.trabajosQueSabe ?? "",
      expComprobable: c.experienciaComprobable ? "Sí" : "No",
      referencias: c.referenciasLaborales ?? "",
      dispInicio: c.disponibilidadInicio ? DISPONIBILIDAD_LABEL[c.disponibilidadInicio] : "",
      dispHoraria: c.disponibilidadHoraria ?? "",
      pretension: c.pretensionSalarialDiaria ?? "",
      ultimaRemuneracion: c.ultimaRemuneracionDiaria ?? "",
      aceptaJornada: c.aceptaJornada ? "Sí" : "No",
      aceptaObra: c.aceptaObra ? "Sí" : "No",
      herramientas: c.herramientasPropias ? "Sí" : "No",
      movilidad: c.movilidadPropia ? "Sí" : "No",
      puntaje: c.puntaje,
      clasificacion: c.clasificacion ?? "",
      estado: ESTADO_LABEL[c.estado],
      observaciones: c.observaciones ?? "",
      fecha: new Date(c.creadoEn).toLocaleDateString("es-AR"),
    })
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="candidatos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
