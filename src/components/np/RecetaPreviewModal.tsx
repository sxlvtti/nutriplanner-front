import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { comidaTexto, nivelTexto } from "@/components/np/ui";
import {
  Clock,
  Repeat,
  ExternalLink,
  Shuffle,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ChefHat,
  ListChecks,
} from "lucide-react";
import { useApp } from "@/lib/app-state";
import {
  nombreIngrediente,
  resolverIngrediente,
  estadoReceta,
} from "@/lib/restricciones";
import type { Receta, TipoComida } from "@/types";

interface RecetaPreviewModalProps {
  receta: Receta | null;
  dia?: string | undefined;
  tipo?: TipoComida | undefined;
  isOpen: boolean;
  onClose: () => void;
  onReemplazar?: ((dia: string, tipo: TipoComida) => void) | undefined;
}

export function RecetaPreviewModal({
  receta,
  dia,
  tipo,
  isOpen,
  onClose,
  onReemplazar,
}: RecetaPreviewModalProps) {
  const { perfil } = useApp();

  if (!receta) return null;

  const estado = estadoReceta(receta, perfil);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card p-0 shadow-2xl flex flex-col gap-0">
        {/* Cabecera con Imagen de la receta */}
        <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full shrink-0 overflow-hidden bg-muted">
          <img
            src={receta.imagen}
            alt={receta.nombre}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/25" />

          {/* Badges superiores sobre imagen */}
          <div className="absolute left-5 top-4 flex flex-wrap items-center gap-2 pr-12">
            {tipo && (
              <span className="rounded-full bg-primary/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm backdrop-blur-md">
                {dia ? `${dia} · ` : ""}
                {comidaTexto[tipo]}
              </span>
            )}
            {receta.tipos_comida.map((t) => (
              <span
                key={t}
                className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
              >
                {comidaTexto[t]}
              </span>
            ))}
          </div>

          {/* Título en la base de la imagen */}
          <div className="absolute bottom-3 left-5 right-5">
            <DialogTitle className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl drop-shadow-sm">
              {receta.nombre}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Vista previa, ingredientes y pasos de preparación de {receta.nombre}
            </DialogDescription>
          </div>
        </div>

        {/* Barra de metadatos (Tiempo, dificultad, calorías, aptitud) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-secondary/30 px-6 py-3 text-xs sm:text-sm shrink-0">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              {receta.tiempo_preparacion} min
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ChefHat className="h-4 w-4 text-primary" />
              {nivelTexto[receta.dificultad]}
            </span>
            {receta.info_nutricional && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Flame className="h-4 w-4 text-primary" />
                  {receta.info_nutricional}
                </span>
              </>
            )}
          </div>

          {/* Estado de aptitud */}
          <div>
            {estado === "COMPATIBLE" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Compatible con tu perfil
              </span>
            ) : estado === "SUSTITUCION" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                <Repeat className="h-3.5 w-3.5" />
                Apta con sustitución
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                No recomendada para tu perfil
              </span>
            )}
          </div>
        </div>

        {/* Contenido scrolleable: 2 columnas en desktop */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6 md:grid-cols-5">
            {/* Columna de Ingredientes (2 de 5) */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
                <ListChecks className="h-4 w-4 text-primary" />
                <h3>Ingredientes ({receta.ingredientes.length})</h3>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 sm:p-4">
                <ul className="divide-y divide-border/50 text-xs sm:text-sm">
                  {receta.ingredientes.map((ri) => {
                    const res = resolverIngrediente(ri, perfil);
                    return (
                      <li
                        key={ri.ingrediente_id}
                        className="flex items-start justify-between gap-2 py-2"
                      >
                        <div className="leading-snug">
                          {res?.sustituido ? (
                            <>
                              <span className="block text-muted-foreground line-through">
                                {nombreIngrediente(ri.ingrediente_id)}
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                <Repeat className="h-3 w-3" />
                                {nombreIngrediente(res.id)}
                              </span>
                            </>
                          ) : (
                            <span
                              className={
                                res
                                  ? "font-medium text-foreground"
                                  : "font-medium text-destructive"
                              }
                            >
                              {nombreIngrediente(ri.ingrediente_id)}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {ri.cantidad}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Columna de Preparación (3 de 5) */}
            <div className="space-y-3 md:col-span-3">
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
                <ChefHat className="h-4 w-4 text-primary" />
                <h3>Pasos de preparación</h3>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 sm:p-4">
                <ol className="space-y-3 text-xs sm:text-sm">
                  {receta.pasos.split("\n").map((paso, idx) => (
                    <li key={idx} className="flex gap-3 leading-relaxed">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5 text-foreground">{paso}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior de acciones */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/60 bg-secondary/40 px-6 py-3.5 shrink-0">
          <a
            href={`/recetas/${receta.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir receta completa en otra pestaña
          </a>

          <div className="flex w-full sm:w-auto items-center justify-end gap-2">
            {onReemplazar && dia && tipo && (
              <button
                type="button"
                onClick={() => onReemplazar(dia, tipo)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-input bg-card px-4 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary active:scale-95"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Reemplazar por otra
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-95"
            >
              Cerrar preview
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
