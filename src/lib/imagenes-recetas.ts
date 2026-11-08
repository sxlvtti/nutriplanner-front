// Imágenes locales del catálogo de NutriPlanner.
// El archivo se selecciona por nombre de receta, nunca por ID.
// Vite incorpora automáticamente los .webp presentes en src/assets/recetas.
import sinImagen from "../assets/recetas/sin-imagen.svg";

const archivos = import.meta.glob<string>("../assets/recetas/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const imagenesPorNombre: Record<string, string> = Object.fromEntries(
  Object.entries(archivos).map(([ruta, imagen]) => {
    const nombreArchivo = ruta.split("/").pop()!.replace(/\.webp$/, "");
    return [nombreArchivo, imagen];
  }),
);

export function obtenerImagenReceta(nombre: string | undefined): string {
  if (!nombre) return sinImagen;
  return imagenesPorNombre[normalizarNombre(nombre)] ?? sinImagen;
}
