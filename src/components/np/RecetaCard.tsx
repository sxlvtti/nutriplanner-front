import { Link } from "@tanstack/react-router";
import { Clock, Heart, Ban } from "lucide-react";
import type { Receta } from "@/types";
import { Badge, comidaTexto, nivelTexto } from "./ui";
import { estadoReceta } from "@/lib/restricciones";
import { useApp } from "@/lib/app-state";

export function RecetaCard({ receta }: { receta: Receta }) {
  const { perfil, favoritas, excluidas, alternarFavorita, alternarExcluida } =
    useApp();

  const estado = estadoReceta(receta, perfil);
  const excluida = excluidas.includes(receta.id);
  const esFavorita = favoritas.includes(receta.id);

  const badgeEstadoClase =
    estado === "COMPATIBLE"
      ? "bg-primary-soft text-primary"
      : estado === "SUSTITUCION"
        ? "bg-warning-soft text-warning"
        : "bg-red-500 text-white";

  const badgeEstadoTexto =
    estado === "COMPATIBLE"
      ? "Compatible"
      : estado === "SUSTITUCION"
        ? "Requiere sustitución"
        : "No disponible";

  return (
    <article
      className={`group overflow-hidden rounded-2xl border bg-card shadow-card ${excluida ? "opacity-60" : ""
        }`}
    >
      <Link to="/recetas/$id" params={{ id: String(receta.id) }}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={receta.imagen}
            alt={receta.nombre}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeEstadoClase}`}
          >
            {badgeEstadoTexto}
          </span>
        </div>
      </Link>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to="/recetas/$id" params={{ id: String(receta.id) }}>
            <h3 className="text-lg font-semibold leading-snug">
              {receta.nombre}
            </h3>
          </Link>

          <div className="flex">
            <button
              type="button"
              onClick={() => alternarFavorita(receta.id)}
              aria-label="Alternar favorita"
              className="rounded-full p-1.5 text-primary hover:bg-primary-soft"
            >
              <Heart
                className={`h-4 w-4 ${esFavorita ? "fill-current" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => alternarExcluida(receta.id)}
              aria-label="Excluir receta"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <Ban
                className={`h-4 w-4 ${excluida ? "text-destructive" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {receta.tiempo_preparacion} min
          </span>
          <span>·</span>
          <span>{nivelTexto[receta.dificultad]}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {receta.tipos_comida.map((t) => (
            <Badge key={t}>{comidaTexto[t]}</Badge>
          ))}
        </div>
      </div>
    </article>
  );
}
