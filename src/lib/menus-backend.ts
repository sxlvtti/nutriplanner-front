
import { api, type MenuGuardadoDetalle } from "@/services/api";
import type { Menu } from "@/types";

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function obtenerNombreDia(fechaInicio: string, desplazamiento: number): string {
  const [anio = 2026, mes = 1, dia = 1] = fechaInicio
    .split("-")
    .map(Number);

  const fecha = new Date(anio, mes - 1, dia);
  fecha.setDate(fecha.getDate() + desplazamiento);

  const nombre = fecha.toLocaleDateString("es-AR", {
    weekday: "long",
  });

  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function convertirMenuBackend(
  datos: MenuGuardadoDetalle
): Menu {
  const dias: Menu["dias"] = Array.from(
    { length: datos.cantidad_dias },
    (_, indice) => ({
      dia: datos.fecha_inicio
        ? obtenerNombreDia(datos.fecha_inicio, indice)
        : `Día ${indice + 1}`,
      comidas: {},
      sustituciones: {},
      instantaneas: {},
    })
  );

  for (const comida of datos.comidas) {
    const dia = dias[comida.dia - 1];

    if (!dia) continue;

    dia.comidas[comida.tipo_comida] = comida.receta_id;

    if (!dia.instantaneas) {
      dia.instantaneas = {};
    }

    dia.instantaneas[comida.tipo_comida] =
      comida.instantanea;
  }

  return {
    id: datos.id,
    nombre: datos.nombre,
    creado: datos.fecha_creacion,
    dias,
  };
}

export async function obtenerMenusDesdeBackend(): Promise<Menu[]> {
  const resumenes = await api.listarMenusBackend();

  const detalles = await Promise.all(
    resumenes.map((menu) =>
      api.obtenerMenuBackend(menu.id)
    )
  );

  return detalles.map(convertirMenuBackend);
}
