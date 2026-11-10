import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  Clock,
  Heart,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { AppLayout } from "@/components/np/AppLayout";
import { Badge, Button, Card, comidaTexto, nivelTexto } from "@/components/np/ui";
import { recetas as mockRecetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import {
  api,
  ApiError,
  getErrorMessage,
  type SustitucionGuardadaResponse,
} from "@/services/api";
import { nombreIngrediente } from "@/lib/restricciones";
import type { CompatibilidadReceta, Ingrediente, Receta } from "@/types";

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

/**
 * Separa el texto de preparación en pasos.
 * Cada paso termina con un punto seguido de espacio (o fin de texto).
 * El punto sirve solo como separador: no se muestra en pantalla.
 * Los decimales (ej: 1.5) no se cortan porque el punto no va seguido de espacio.
 * También respeta saltos de línea por compatibilidad con recetas viejas.
 */
function separarPasos(texto: string): string[] {
  return texto
    .split(/\n+|\.(?:\s+|$)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function Detalle() {
  const { id } = Route.useParams();

  const {
    favoritas,
    excluidas,
    alternarFavorita,
    alternarExcluida,
  } = useApp();

  const [r, setR] = useState<Receta | null>(null);

  const [compatibilidad, setCompatibilidad] =
    useState<CompatibilidadReceta | null>(null);

  const [sustitucionesGuardadas, setSustitucionesGuardadas] =
    useState<SustitucionGuardadaResponse[]>([]);


  const [selecciones, setSelecciones] =
    useState<Record<number, number>>({});

  const [guardandoId, setGuardandoId] =
    useState<number | null>(null);

  const [errorSustitucion, setErrorSustitucion] =
    useState<string | null>(null);


  const [ingredientesCatalogo, setIngredientesCatalogo] =
    useState<Ingrediente[]>([]);

  // Índices de los pasos que el usuario marcó como terminados.
  const [pasosHechos, setPasosHechos] = useState<Set<number>>(new Set());

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
      const [
        datosReceta,
        datosIngredientes,
        datosCompatibilidad,
        datosSustituciones,
      ] = await Promise.all([
        api.getReceta(id),
        api.getIngredientes().catch(() => []),
        api.getCompatibilidadReceta(Number(id)),
        api.getSustitucionesReceta(Number(id)),
      ]);


      setR(datosReceta);
      setCompatibilidad(datosCompatibilidad);
      setSustitucionesGuardadas(datosSustituciones);

      setSelecciones(
        Object.fromEntries(
          datosSustituciones.map((sustitucion) => [
            sustitucion.receta_ingrediente_id,
            sustitucion.alternativa_id,
          ])
        )
      );

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

  // Al cambiar de receta se reinicia el progreso de los pasos.
  useEffect(() => {
    setPasosHechos(new Set());
  }, [id]);

  const resolverNombre = (ingId: number) => {
    const item = ingredientesCatalogo.find((i) => i.id === ingId);
    if (item) return item.nombre;
    return nombreIngrediente(ingId);
  };

  const alternarPaso = (indice: number) => {
    setPasosHechos((anteriores) => {
      const nuevos = new Set(anteriores);
      if (nuevos.has(indice)) {
        nuevos.delete(indice);
      } else {
        nuevos.add(indice);
      }
      return nuevos;
    });
  };


  const guardarSustitucion = async (
    recetaIngredienteId: number
  ) => {
    const alternativaId = selecciones[recetaIngredienteId];

    if (alternativaId === undefined) {
      return;
    }

    setGuardandoId(recetaIngredienteId);
    setErrorSustitucion(null);

    try {
      const guardada = await api.guardarSustitucionReceta(
        Number(id),
        recetaIngredienteId,
        alternativaId
      );

      setSustitucionesGuardadas((anteriores) => [
        ...anteriores.filter(
          (item) =>
            item.receta_ingrediente_id !== recetaIngredienteId
        ),
        guardada,
      ]);

    } catch (error) {
      setErrorSustitucion(
        getErrorMessage(
          error,
          "No se pudo guardar la sustitución."
        )
      );

    } finally {
      setGuardandoId(null);
    }
  };


  const eliminarSustitucion = async (
    recetaIngredienteId: number
  ) => {
    setGuardandoId(recetaIngredienteId);
    setErrorSustitucion(null);

    try {
      await api.eliminarSustitucionReceta(
        Number(id),
        recetaIngredienteId
      );

      setSustitucionesGuardadas((anteriores) =>
        anteriores.filter(
          (item) =>
            item.receta_ingrediente_id !== recetaIngredienteId
        )
      );

      setSelecciones((anteriores) => {
        const nuevasSelecciones = { ...anteriores };
        delete nuevasSelecciones[recetaIngredienteId];
        return nuevasSelecciones;
      });

    } catch (error) {
      setErrorSustitucion(
        getErrorMessage(
          error,
          "No se pudo eliminar la sustitución."
        )
      );

    } finally {
      setGuardandoId(null);
    }
  };

  const pasos = r ? separarPasos(r.pasos ?? "") : [];
  const totalPasos = pasos.length;
  const hechos = pasosHechos.size;
  const progreso = totalPasos > 0 ? Math.round((hechos / totalPasos) * 100) : 0;

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
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
          {/* IMAGEN: ocupa toda la altura de la columna derecha */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-card lg:aspect-auto lg:min-h-[320px]">
            <img
              src={r.imagen}
              alt={r.nombre}
              width={1024}
              height={768}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

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
                  className={`h-4 w-4 ${favoritas.includes(r.id) ? "fill-current text-primary" : ""
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
                  className={`h-4 w-4 ${excluidas.includes(r.id) ? "text-destructive" : ""
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


            {compatibilidad?.estado_compatibilidad === "INCOMPATIBLE" && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                Esta receta no es compatible con tus restricciones
                alimentarias.
              </p>
            )}

            {compatibilidad?.estado_compatibilidad === "ADAPTABLE" && (
              <p className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
                Esta receta requiere sustituciones de ingredientes
                para ser compatible con tu perfil alimentario.
              </p>
            )}

            {compatibilidad?.estado_compatibilidad === "COMPATIBLE" && (
              <p className="mt-3 rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
                Esta receta es compatible con tu perfil alimentario.
              </p>
            )}

            <Card className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Ingredientes</h2>
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                  {r.ingredientes.length}{" "}
                  {r.ingredientes.length === 1 ? "ingrediente" : "ingredientes"}
                </span>
              </div>

              <ul className="space-y-2">
                {r.ingredientes.map((ri) => {
                  // Buscar si FastAPI marcó este ingrediente
                  // como restringido.
                  const restriccion =
                    compatibilidad?.ingredientes_restringidos.find(
                      (ing) => ing.ingrediente_id === ri.ingrediente_id
                    );

                  const restringido = restriccion !== undefined;

                  const alternativas =
                    restriccion?.alternativas_validas ?? [];

                  return (
                    <li
                      key={ri.ingrediente_id}
                      className={`rounded-xl border px-4 py-3 text-sm transition ${restringido
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-transparent bg-secondary/40 hover:bg-secondary/70"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={
                            restringido
                              ? "font-medium text-destructive"
                              : "font-medium"
                          }
                        >
                          {resolverNombre(ri.ingrediente_id)}
                        </span>

                        <span className="shrink-0 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                          {ri.cantidad} {ri.unidad}
                        </span>
                      </div>

                      {restriccion && (
                        <div className="mt-2">
                          {alternativas.length > 0 ? (
                            <div className="rounded-lg bg-warning-soft p-3">
                              <p className="text-xs font-medium text-warning">
                                Ingrediente restringido.
                                Alternativas disponibles:
                              </p>

                              <fieldset className="mt-3">
                                <legend className="mb-2 text-xs font-semibold">
                                  Elegí una alternativa:
                                </legend>

                                <div className="space-y-2">
                                  {alternativas.map((alt) => (
                                    <label
                                      key={alt.id}
                                      className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
                                    >
                                      <input
                                        type="radio"
                                        name={`sustitucion-${restriccion.receta_ingrediente_id}`}
                                        value={alt.id}
                                        checked={
                                          selecciones[
                                          restriccion.receta_ingrediente_id
                                          ] === alt.id
                                        }
                                        disabled={guardandoId !== null}
                                        onChange={() => {
                                          setSelecciones((anteriores) => ({
                                            ...anteriores,
                                            [restriccion.receta_ingrediente_id]:
                                              alt.id,
                                          }));

                                          setErrorSustitucion(null);
                                        }}
                                      />

                                      <span>
                                        {alt.nombre} — {alt.cantidad}{" "}
                                        {alt.unidad}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </fieldset>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={
                                    guardandoId !== null ||
                                    selecciones[
                                    restriccion.receta_ingrediente_id
                                    ] === undefined ||
                                    sustitucionesGuardadas.some(
                                      (item) =>
                                        item.receta_ingrediente_id ===
                                        restriccion.receta_ingrediente_id &&
                                        item.alternativa_id ===
                                        selecciones[
                                        restriccion.receta_ingrediente_id
                                        ]
                                    )
                                  }
                                  onClick={() =>
                                    void guardarSustitucion(
                                      restriccion.receta_ingrediente_id
                                    )
                                  }
                                >
                                  {guardandoId ===
                                    restriccion.receta_ingrediente_id
                                    ? "Guardando..."
                                    : "Guardar sustitución"}
                                </Button>

                                {sustitucionesGuardadas.some(
                                  (item) =>
                                    item.receta_ingrediente_id ===
                                    restriccion.receta_ingrediente_id
                                ) && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={guardandoId !== null}
                                      onClick={() =>
                                        void eliminarSustitucion(
                                          restriccion.receta_ingrediente_id
                                        )
                                      }
                                    >
                                      {guardandoId ===
                                        restriccion.receta_ingrediente_id
                                        ? "Procesando..."
                                        : "Quitar sustitución"}
                                    </Button>
                                  )}
                              </div>

                              {sustitucionesGuardadas
                                .filter(
                                  (item) =>
                                    item.receta_ingrediente_id ===
                                    restriccion.receta_ingrediente_id
                                )
                                .map((item) => (
                                  <p
                                    key={item.alternativa_id}
                                    className="mt-2 text-xs font-medium text-green-700"
                                  >
                                    ✓ Sustitución guardada: {item.nombre}
                                  </p>
                                ))}

                              {errorSustitucion && (
                                <p className="mt-2 text-xs text-destructive">
                                  {errorSustitucion}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-destructive">
                              Ingrediente restringido sin alternativa
                              compatible.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* PREPARACIÓN: cada paso se puede marcar como terminado */}
          <Card className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Preparación</h2>

              {totalPasos > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {hechos} de {totalPasos}{" "}
                    {totalPasos === 1 ? "paso" : "pasos"}
                  </span>
                  {hechos > 0 && (
                    <button
                      type="button"
                      onClick={() => setPasosHechos(new Set())}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reiniciar
                    </button>
                  )}
                </div>
              )}
            </div>

            {totalPasos > 0 ? (
              <>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progreso}
                  className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progreso}%` }}
                  />
                </div>

                <ol className="space-y-2.5">
                  {pasos.map((p, i) => {
                    const hecho = pasosHechos.has(i);

                    return (
                      <li key={i}>
                        <button
                          type="button"
                          aria-pressed={hecho}
                          onClick={() => alternarPaso(i)}
                          className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left text-sm transition ${hecho
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-transparent bg-secondary/40 hover:bg-secondary/70"
                            }`}
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${hecho
                              ? "bg-green-500 text-white"
                              : "bg-primary text-primary-foreground"
                              }`}
                          >
                            {hecho ? (
                              <Check className="h-4 w-4" strokeWidth={3} />
                            ) : (
                              i + 1
                            )}
                          </span>

                          <span
                            className={`flex-1 leading-relaxed ${hecho ? "line-through decoration-green-400/70" : ""
                              }`}
                          >
                            {p}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>

                {hechos === totalPasos && (
                  <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-800">
                    ¡Receta terminada! Que la disfrutes.
                  </p>
                )}
              </>
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