import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Ban, Clock, Heart, RotateCcw, WifiOff } from "lucide-react";
import { AppLayout } from "@/components/np/AppLayout";
import { Badge, Button, Card, comidaTexto, nivelTexto } from "@/components/np/ui";
import { recetas as mockRecetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { ingredienteProhibido, nombreIngrediente, recetaApta } from "@/lib/restricciones";
import { api, ApiError, getErrorMessage } from "@/services/api";
import type { Ingrediente, Receta } from "@/types";

export const Route = createFileRoute("/recetas/$id")({
  head: ({ params }) => {
    const r = mockRecetas.find((x) => String(x.id) === params.id);
    const title = r ? `${r.nombre} — NutriPlanner` : "Receta — NutriPlanner";
    const description = r
      ? `Ingredientes, pasos y sustituciones de ${r.nombre}.`
      : "Detalle de receta en NutriPlanner.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Detalle,
});

function Detalle() {
  const { id } = Route.useParams();
  const { perfil, favoritas, excluidas, alternarFavorita, alternarExcluida } = useApp();

  const [r, setR] = useState<Receta | null>(null);
  const [ingredientesCatalogo, setIngredientesCatalogo] = useState<Ingrediente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [es404, setEs404] = useState(false);
  const [esErrorRed, setEsErrorRed] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setEs404(false);
    setEsErrorRed(false);

    try {
      const [datosReceta, datosIngredientes] = await Promise.all([
        api.getReceta(id),
        api.getIngredientes().catch(() => []),
      ]);
      setR(datosReceta);
      if (datosIngredientes && datosIngredientes.length) {
        setIngredientesCatalogo(datosIngredientes);
      }
    } catch (err) {
      if (err instanceof ApiError && err.isNotFound) {
        setEs404(true);
        setError("La receta solicitada no existe o fue dada de baja.");
      } else {
        const esRed = err instanceof ApiError ? err.isNetworkError : false;
        setEsErrorRed(esRed);
        setError(getErrorMessage(err, "No se pudo cargar la información de la receta."));
      }
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resolverNombre = (ingId: number) => {
    const item = ingredientesCatalogo.find((i) => i.id === ingId);
    if (item) return item.nombre;
    return nombreIngrediente(ingId);
  };

  return (
    <AppLayout>
      <Link
        to="/recetas"
        onClick={(e) => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            e.preventDefault();
            window.history.back();
          }
        }}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      {cargando ? (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] animate-pulse">
          <div className="aspect-[4/3] w-full rounded-3xl bg-muted/60 shadow-card" />
          <div className="space-y-4">
            <div className="h-6 w-1/4 rounded-full bg-muted/60" />
            <div className="h-10 w-3/4 rounded-lg bg-muted/70" />
            <div className="h-5 w-1/3 rounded-md bg-muted/50" />
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-36 rounded-full bg-muted/60" />
              <div className="h-10 w-36 rounded-full bg-muted/60" />
            </div>
            <div className="h-44 rounded-2xl bg-muted/40 p-6" />
          </div>
          <div className="h-48 rounded-2xl bg-muted/40 p-6 lg:col-span-2" />
        </div>
      ) : error ? (
        es404 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/40 py-16 text-center">
            <h2 className="text-xl font-semibold">Receta no encontrada</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Link
              to="/recetas"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al catálogo
            </Link>
          </div>
        ) : (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              {esErrorRed ? (
                <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Error al cargar la receta
                </p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void cargar()}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reintentar
              </Button>
              <Link
                to="/recetas"
                className="inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver
              </Link>
            </div>
          </div>
        )
      ) : !r ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/40 py-16 text-center">
          <p className="text-muted-foreground">Receta no disponible.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <img
            src={r.imagen}
            alt={r.nombre}
            width={1024}
            height={768}
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card"
          />
          <div>
            <div className="flex flex-wrap gap-1.5">
              {r.tipos_comida.map((t) => (
                <Badge key={t}>{comidaTexto[t]}</Badge>
              ))}
            </div>
            <h1 className="mt-3 text-4xl font-semibold">{r.nombre}</h1>

            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {r.tiempo_preparacion} min
              </span>
              <span>·</span>
              <span>{nivelTexto[r.dificultad]}</span>
            </div>

            {/* FAVORITOS Y EXCLUSIÓN */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => alternarFavorita(r.id)}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-primary-soft transition"
              >
                <Heart
                  className={`h-4 w-4 ${
                    favoritas.includes(r.id) ? "fill-current text-primary" : ""
                  }`}
                />
                {favoritas.includes(r.id)
                  ? "Quitar de favoritos"
                  : "Agregar a favoritos"}
              </button>

              <button
                type="button"
                onClick={() => alternarExcluida(r.id)}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-secondary transition"
              >
                <Ban
                  className={`h-4 w-4 ${
                    excluidas.includes(r.id) ? "text-destructive" : ""
                  }`}
                />
                {excluidas.includes(r.id)
                  ? "Quitar exclusión"
                  : "Excluir receta"}
              </button>
            </div>

            {/* INFORMACIÓN NUTRICIONAL */}
            {r.info_nutricional && (
              <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
                {r.info_nutricional}
              </p>
            )}

            {!recetaApta(r, perfil) && (
              <p className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
                Esta receta no es apta para tu perfil (por ingredientes o nivel culinario).
              </p>
            )}

            <Card className="mt-6">
              <h2 className="mb-3 text-xl font-semibold">Ingredientes</h2>
              <ul className="divide-y">
                {r.ingredientes.map((ri) => {
                  const restringido = ingredienteProhibido(
                    ri.ingrediente_id,
                    perfil
                  );

                  const tieneAlternativa =
                    restringido &&
                    ri.sustituto_id != null &&
                    !ingredienteProhibido(ri.sustituto_id, perfil);

                  return (
                    <li key={ri.ingrediente_id} className="py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className={restringido ? "text-destructive font-medium" : ""}>
                          {resolverNombre(ri.ingrediente_id)}
                        </span>
                        <span className="text-muted-foreground">{ri.cantidad}</span>
                      </div>
                      {restringido && (
                        <p className="mt-1 text-xs text-warning">
                          {tieneAlternativa
                            ? "Ingrediente restringido. Tiene una alternativa disponible."
                            : "Ingrediente restringido. No tiene una alternativa compatible."}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">Preparación</h2>
            {r.pasos.trim() ? (
              <ol className="space-y-3">
                {r.pasos
                  .split("\n")
                  .filter((p) => p.trim().length > 0)
                  .map((p, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{p}</span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay pasos de preparación especificados para esta receta.
              </p>
            )}
          </Card>
        </div>
      )}
    </AppLayout>
  );
}