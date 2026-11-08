import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  Eye,
  RefreshCw,
  Save,
  Sparkles,
  Shuffle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/np/AppLayout";
import { RecetaPreviewModal } from "@/components/np/RecetaPreviewModal";
import {
  Button,
  Card,
  Chip,
  PageHeader,
  comidaTexto,
  nivelTexto,
} from "@/components/np/ui";
import {
  api,
  getErrorMessage,
  type CompatibilidadRecetaResponse,
  type GuardarMenuBackendRequest,
} from "@/services/api";
import { useApp } from "@/lib/app-state";
import { recetaApta } from "@/lib/restricciones";
import { cn } from "@/lib/utils";
import type {
  Menu,
  Receta,
  TipoComida,
  Ingrediente,
} from "@/types";

export const Route = createFileRoute("/generador")({ component: Generador });

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function obtenerDiasConsecutivos(
  cantidad: number,
  fechaInicio: Date = new Date()
): string[] {
  return Array.from({ length: cantidad }, (_, indice) => {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fechaInicio.getDate() + indice);

    const nombreDia = fecha.toLocaleDateString("es-AR", {
      weekday: "long",
    });

    return nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
  });
}

const TIPOS = Object.keys(comidaTexto) as TipoComida[];

function Generador() {
  const { perfil, excluidas, guardarMenuBackend } = useApp();
  const navigate = useNavigate();

  const [cantDias, setCantDias] = useState(3);
  const [comidas, setComidas] = useState<TipoComida[]>([
    "DESAYUNO",
    "ALMUERZO",
    "CENA",
  ]);

  const [menu, setMenu] = useState<Menu["dias"] | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [nombre, setNombre] = useState("Mi menú semanal");
  const [aviso, setAviso] = useState("");
  const [previewReceta, setPreviewReceta] = useState<{
    receta: Receta;
    dia: string;
    tipo: TipoComida;
  } | null>(null);

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [ingredientesCatalogo, setIngredientesCatalogo] =
    useState<Ingrediente[]>([]);

  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [compatibilidades, setCompatibilidades] = useState<
    Record<number, CompatibilidadRecetaResponse>
  >({});
  const [alertasAPI, setAlertasAPI] = useState<

    Record<
      string,
      {
        requiereSustituciones: boolean;
        conflictoFlexible: boolean;
      }
    >
  >({});

  const [cambiosLocalesSinValidar, setCambiosLocalesSinValidar] =
    useState(false);

  // RECETAS DISPONIBLES
  const opciones = (tipo: TipoComida) =>
    recetas.filter(
      (r) =>
        r.tipos_comida.includes(tipo) &&
        recetaApta(r, perfil) &&
        !excluidas.includes(r.id)
    );


  // INGREDIENTES PENDIENTES SEGÚN FASTAPI
  const ingredientesPendientes = (
    dia: Menu["dias"][number],
    tipo: TipoComida
  ) => {
    const recetaId = dia.comidas[tipo];

    if (recetaId == null) return [];

    const compatibilidad = compatibilidades[recetaId];

    if (!compatibilidad) return [];

    const confirmadas = dia.sustituciones?.[tipo] ?? [];

    return compatibilidad.ingredientes_restringidos.filter(
      (ingrediente) =>
        !confirmadas.some(
          (seleccion) =>
            seleccion.ingrediente_original_id ===
              ingrediente.ingrediente_id &&
            ingrediente.alternativas_validas.some(
              (alternativa) =>
                alternativa.ingrediente_id ===
                seleccion.ingrediente_alternativo_id
            )
        )
    );
  };

  // GENERAR MENÚ CON FASTAPI
  const generar = async () => {
    if (comidas.length === 0 || generando) return;

    setGenerando(true);
    setAviso("");
    setMenu(null);
    setFechaInicio(null);
    setPreviewReceta(null);
    setAlertasAPI({});
    setCambiosLocalesSinValidar(false);

    try {
      // Obtener la fecha de inicio del menú
      const hoy = new Date();

      const fechaLocal = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, "0"),
        String(hoy.getDate()).padStart(2, "0"),
      ].join("-");

      // 1. Solicitar el menú al backend
      const propuesta = await api.generarMenu({
        cantidad_dias: cantDias,
        tipos_comida: comidas,
        comensales: 1,
        tamano_porcion: "NORMAL",
      });

      // 2. Obtener recetas e ingredientes reales desde FastAPI
      const [catalogo, catalogoIngredientes] = await Promise.all([
        api.getRecetas(),
        api.getIngredientes(),
      ]);

      setIngredientesCatalogo(catalogoIngredientes);

      const idsRecetas = [
        ...new Set(
          propuesta.comidas
            .map((comida) => comida.receta_id)
            .filter((id): id is number => id !== null)
        ),
      ];

      const idsFaltantes = idsRecetas.filter(
        (id) => !catalogo.some((receta) => receta.id === id)
      );

      const recetasAdicionales = await Promise.all(
        idsFaltantes.map((id) => api.getReceta(id))
      );

      setRecetas([...catalogo, ...recetasAdicionales]);


      const resultadosCompatibilidad = await Promise.all(
        idsRecetas.map(async (id) => ({
          id,
          detalle: await api.getCompatibilidadReceta(id),
        }))
      );

      const mapaCompatibilidades: Record<
        number,
        CompatibilidadRecetaResponse
      > = {};

      resultadosCompatibilidad.forEach(({ id, detalle }) => {
        mapaCompatibilidades[id] = detalle;
      });

      setCompatibilidades(mapaCompatibilidades);


      // 3. Adaptar la respuesta al formato del frontend
      const primerDia = propuesta.comidas.length > 0
        ? Math.min(...propuesta.comidas.map((comida) => comida.dia))
        : 1;

      const diasGenerados = obtenerDiasConsecutivos(cantDias, hoy);

      const dias: Menu["dias"] = diasGenerados.map(
        (dia, indice) => {
          const asignadas: Menu["dias"][number]["comidas"] = {};

          propuesta.comidas
            .filter((comida) => comida.dia === primerDia + indice)
            .forEach((comida) => {
              if (comida.receta_id !== null) {
                asignadas[comida.tipo_comida] = comida.receta_id;
              }
            });

          return {
            dia,
            comidas: asignadas,
            sustituciones: {},
          };
        }
      );

      // 4. Registrar las advertencias del backend
      const nuevasAlertas: typeof alertasAPI = {};

      propuesta.comidas.forEach((comida) => {
        const dia = diasGenerados[comida.dia - primerDia];

        if (!dia) return;

        nuevasAlertas[`${dia}:${comida.tipo_comida}`] = {
          requiereSustituciones: comida.requiere_sustituciones,
          conflictoFlexible: comida.tiene_conflicto_flexible,
        };
      });

      setAlertasAPI(nuevasAlertas);
      setFechaInicio(fechaLocal);
      setMenu(dias);

      // 5. Mostrar advertencias cuando corresponda
      if (!propuesta.estructura_completa) {
        setAviso(
          "El backend no pudo completar todas las comidas solicitadas."
        );
      } else if (
        Object.values(nuevasAlertas).some(
          (alerta) => alerta.requiereSustituciones
        )
      ) {
        setAviso(
          "El menú fue generado, pero algunas comidas requieren sustituciones pendientes de validación."
        );
      }
    } catch (error) {
      setAviso(getErrorMessage(error));
    } finally {
      setGenerando(false);
    }
  };

  // REEMPLAZAR RECETA
  const reemplazar = (dia: string, tipo: TipoComida) => {
    if (!menu) return;

    const disponibles = opciones(tipo);
    const usados = menu.flatMap((d) =>
      Object.values(d.comidas)
    );

    const nueva =
      disponibles.find((r) => !usados.includes(r.id)) ??
      disponibles[0];

    if (!nueva) {
      setAviso(
        `No hay recetas compatibles para reemplazar el ${comidaTexto[tipo].toLowerCase()}.`
      );
      return;
    }

    setMenu(
      menu.map((d) =>
        d.dia === dia
          ? {
              ...d,
              comidas: {
                ...d.comidas,
                [tipo]: nueva.id,
              },
              sustituciones: {
                ...d.sustituciones,
                [tipo]: [],
              },
            }
          : d
      )
    );

    // El reemplazo fue elegido localmente; no está validado por FastAPI.
    setCambiosLocalesSinValidar(true);
    setAviso(
      "El reemplazo es provisional. Falta validar la receta con el backend antes de guardar."
    );
  };


  // CONFIRMAR SUSTITUCIÓN PARA UNA COMIDA ESPECÍFICA
  const confirmarSustitucion = (
    dia: string,
    tipo: TipoComida,
    originalId: number,
    alternativoId: number
  ) => {
    if (!menu) return;

    const diaActual = menu.find((d) => d.dia === dia);
    const receta = recetas.find(
      (r) => r.id === diaActual?.comidas[tipo]
    );

    const ingredienteExiste = receta?.ingredientes.some(
      (ri) => ri.ingrediente_id === originalId
    );

    if (
      !ingredienteExiste ||
      originalId === alternativoId
    ) {
      setAviso("No se pudo confirmar esta sustitución.");
      return;
    }

    setMenu((anteriores) =>
      anteriores?.map((d) => {
        if (d.dia !== dia) return d;

        const seleccionadas = d.sustituciones?.[tipo] ?? [];

        return {
          ...d,
          sustituciones: {
            ...d.sustituciones,
            [tipo]: [
              ...seleccionadas.filter(
                (s) => s.ingrediente_original_id !== originalId
              ),
              {
                ingrediente_original_id: originalId,
                ingrediente_alternativo_id: alternativoId,
              },
            ],
          },
        };
      }) ?? null
    );

    setAviso(
      "Sustitución seleccionada. FastAPI verificará " +
      "su validez cuando guardes el menú."
    );
  };


  // CONTAR SUSTITUCIONES PENDIENTES
  const pendientes = menu
    ? menu.reduce(
        (total, dia) =>
          total +
          comidas.reduce(
            (subtotal, tipo) =>
              subtotal + ingredientesPendientes(dia, tipo).length,
            0
          ),
        0
      )
    : 0;

  const haySustitucionesAPI = Object.values(alertasAPI).some(
    (alerta) => alerta.requiereSustituciones
  );

  const faltanRecetas = menu
    ? menu.some((dia) =>
        comidas.some((tipo) => dia.comidas[tipo] == null)
      )
    : false;


  // GUARDAR MENÚ Y SUS SUSTITUCIONES EN FASTAPI
  const guardar = async () => {
    if (!menu || !fechaInicio || faltanRecetas || guardando) {
      return;
    }

    const hayConflictoFlexible = Object.values(alertasAPI).some(
      (alerta) => alerta.conflictoFlexible
    );

    if (
      hayConflictoFlexible &&
      !window.confirm(
        "El menú contiene conflictos alimentarios flexibles. " +
        "¿Confirmás que querés guardar estas recetas?"
      )
    ) {
      return;
    }

    setGuardando(true);
    setAviso("");

    try {
      const comidasConfirmadas = await Promise.all(
        menu.flatMap((dia, indice) =>
          comidas.map(async (tipo) => {
            const recetaId = dia.comidas[tipo];

            if (recetaId == null) {
              throw new Error(
                `Falta una receta para ${dia.dia}, ${comidaTexto[tipo]}.`
              );
            }

            // Consultar los identificadores reales del backend.
            const compatibilidad =
              await api.getCompatibilidadReceta(recetaId);

            if (
              compatibilidad.estado_compatibilidad ===
              "INCOMPATIBLE"
            ) {
              throw new Error(
                `La receta de ${dia.dia}, ${comidaTexto[tipo]}, ` +
                "no es compatible con tu perfil."
              );
            }

            const seleccionadas =
              dia.sustituciones?.[tipo] ?? [];

            const sustituciones = seleccionadas.map((seleccion) => {
              const posicion =
                compatibilidad.ingredientes_restringidos.find(
                  (ingrediente) =>
                    ingrediente.ingrediente_id ===
                    seleccion.ingrediente_original_id
                );

              const alternativa =
                posicion?.alternativas_validas.find(
                  (opcion) =>
                    opcion.ingrediente_id ===
                    seleccion.ingrediente_alternativo_id
                );

              if (!posicion || !alternativa) {
                throw new Error(
                  `La sustitución elegida para ${dia.dia}, ` +
                  `${comidaTexto[tipo]}, ya no es válida.`
                );
              }

              return {
                receta_ingrediente_id:
                  posicion.receta_ingrediente_id,
                alternativa_id: alternativa.id,
              };
            });

            // No permitir ingredientes restringidos sin reemplazo.
            const pendiente =
              compatibilidad.ingredientes_restringidos.find(
                (ingrediente) =>
                  !sustituciones.some(
                    (s) =>
                      s.receta_ingrediente_id ===
                      ingrediente.receta_ingrediente_id
                  )
              );

            if (pendiente) {
              throw new Error(
                `Falta confirmar una sustitución de ` +
                `${pendiente.nombre} para ${dia.dia}, ` +
                `${comidaTexto[tipo]}.`
              );
            }

            return {
              dia: indice + 1,
              tipo_comida: tipo,
              receta_id: recetaId,
              sustituciones,
              confirma_conflicto_flexible:
                alertasAPI[`${dia.dia}:${tipo}`]
                  ?.conflictoFlexible ?? false,
              confirma_receta_excluida: false,
            };
          })
        )
      );

      const datos: GuardarMenuBackendRequest = {
        nombre: nombre.trim() || "Menú sin nombre",
        cantidad_dias: cantDias,
        fecha_inicio: fechaInicio,
        comensales: 1,
        tamano_porcion: "NORMAL",

        posiciones_seleccionadas: menu.flatMap(
          (_, indice) =>
            comidas.map((tipo) => ({
              dia: indice + 1,
              tipo_comida: tipo,
            }))
        ),

        comidas: comidasConfirmadas,
      };

      await guardarMenuBackend(datos);

      navigate({ to: "/menus" });
    } catch (error) {
      setAviso(getErrorMessage(error));
    } finally {
      setGuardando(false);
    }
  };


  return (
    <AppLayout>
      <PageHeader
        title="Generar menú"
        subtitle="Elegí entre 1 y 7 días y las comidas que querés incluir."
      />

      <div className="space-y-8">
        {/* CONFIGURACIÓN */}
        <Card className="p-5 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Selector de cantidad de días */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Días a planificar
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {cantDias} {cantDias === 1 ? "día" : "días"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setCantDias(n);
                      setMenu(null);
                      setPreviewReceta(null);
                    }}
                    className={cn(
                      "h-9 w-9 rounded-xl text-sm font-semibold transition-all",
                      cantDias === n
                        ? "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de comidas */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comidas a incluir
              </span>

              <div className="flex flex-wrap gap-2">
                {TIPOS.map((tipo) => (
                  <Chip
                    key={tipo}
                    active={comidas.includes(tipo)}
                    onClick={() => {
                      setComidas(
                        comidas.includes(tipo)
                          ? comidas.filter((x) => x !== tipo)
                          : [...comidas, tipo]
                      );
                      setMenu(null);
                      setPreviewReceta(null);
                    }}
                  >
                    {comidaTexto[tipo]}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Botón para generar */}
            <div className="flex items-center pt-2 lg:pt-0">
              <Button
                onClick={generar}
                disabled={!comidas.length || generando}
                className="w-full shadow-sm lg:w-auto"
              >
                {menu ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generando
                  ? "Generando..."
                  : menu
                  ? "Volver a generar"
                  : "Generar menú"}
              </Button>
            </div>
          </div>
        </Card>

        {/* MENÚ GENERADO */}
        <div>
          {aviso && (
            <div className="mb-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
              {aviso}
            </div>
          )}

          {!menu ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed text-center text-muted-foreground">
              Configurá las opciones y generá tu menú.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {menu.map((dia, index) => (
                  <Card key={dia.dia} className="space-y-4 p-5">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-3">
                        {menu.length > 1 ? (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                            {index + 1}
                          </span>
                        ) : (
                          <CalendarDays className="h-6 w-6 text-primary" />
                        )}

                        <div>
                          <h2 className="font-display text-2xl font-bold tracking-tight">
                            {dia.dia}
                          </h2>

                          <p className="text-xs text-muted-foreground">
                            Día {index + 1} de {menu.length}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                        {comidas.length}{" "}
                        {comidas.length === 1 ? "comida" : "comidas"}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {comidas.map((tipo) => {
                        const receta = recetas.find(
                          (r) => r.id === dia.comidas[tipo]
                        );
                        const pendientesComida =
                          ingredientesPendientes(dia, tipo);

                        const alertaAPI =
                          alertasAPI[`${dia.dia}:${tipo}`];

                        return (
                          <div
                            key={tipo}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                          >
                            <div className="flex items-center justify-between border-b border-border/50 bg-secondary/50 px-4 py-2.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                {comidaTexto[tipo]}
                              </span>

                              {receta && (
                                <span className="text-xs text-muted-foreground">
                                  {nivelTexto[receta.dificultad]}
                                </span>
                              )}
                            </div>

                            {receta ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewReceta({
                                      receta,
                                      dia: dia.dia,
                                      tipo,
                                    })
                                  }
                                  className="group/thumb relative aspect-[16/10] w-full overflow-hidden bg-muted text-left"
                                  title={`Ver detalles de ${receta.nombre}`}
                                >
                                  <img
                                    src={receta.imagen}
                                    alt={receta.nombre}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                                  />

                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover/thumb:opacity-100">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground">
                                      <Eye className="h-3.5 w-3.5 text-primary" />
                                      Ver receta
                                    </span>
                                  </div>
                                </button>

                                <div className="flex flex-1 flex-col justify-between p-4">
                                  <div className="space-y-3">
                                    <div className="space-y-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewReceta({
                                            receta,
                                            dia: dia.dia,
                                            tipo,
                                          })
                                        }
                                        className="line-clamp-2 block text-left font-display text-base font-semibold leading-snug text-foreground transition-colors hover:text-primary"
                                      >
                                        {receta.nombre}
                                      </button>

                                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="h-3.5 w-3.5 text-primary" />
                                          {receta.tiempo_preparacion} min
                                        </span>

                                        {receta.info_nutricional && (
                                          <span className="truncate">
                                            {receta.info_nutricional.split("·")[0]}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {alertaAPI?.conflictoFlexible && (
                                      <p className="mb-2 rounded-xl border border-warning/30 bg-warning/5 p-2.5 text-xs text-warning">
                                        <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                                        Esta receta tiene un conflicto alimentario flexible
                                        señalado por FastAPI. Revisá tu preferencia.
                                      </p>
                                    )}


                                    {pendientesComida.length > 0 ? (
                                      <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 p-2.5">
                                        <p className="text-xs font-semibold text-warning">
                                          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                                          {pendientesComida.length} sustitución(es) pendiente(s)
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                          Revisá los ingredientes y confirmá
                                          las alternativas disponibles.
                                        </p>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewReceta({
                                              receta,
                                              dia: dia.dia,
                                              tipo,
                                            })
                                          }
                                          className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                                        >
                                          Elegir sustituciones
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        <span>Sin sustituciones pendientes</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewReceta({
                                          receta,
                                          dia: dia.dia,
                                          tipo,
                                        })
                                      }
                                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-2.5 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-primary" />
                                      Ver receta
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        reemplazar(dia.dia, tipo)
                                      }
                                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-2.5 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary"
                                    >
                                      <Shuffle className="h-3.5 w-3.5" />
                                      Reemplazar
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                                Sin recetas aptas
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>

              {/* GUARDAR MENÚ */}
              <Card className="mt-6 space-y-4 p-5 shadow-card">
                {/* Advertencias de validación */}
                {pendientes > 0 && (
                  <p className="flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Tenés {pendientes} sustitución(es) pendiente(s).
                    Confirmalas antes de guardar el menú.
                  </p>
                )}

                {faltanRecetas && (
                  <p className="flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    El menú tiene comidas sin receta asignada.
                  </p>
                )}

                {(haySustitucionesAPI || cambiosLocalesSinValidar) && (
                  <p className="flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Hay sustituciones o reemplazos sin validar en FastAPI.
                    FastAPI validará las sustituciones y los
                    reemplazos cuando presiones Guardar menú.
                  </p>
                )}

                {/* Barra inferior de guardado */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-2">
                    <label
                      htmlFor="nombre-menu"
                      className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Nombre del menú
                    </label>

                    <input
                      id="nombre-menu"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Mi menú semanal saludable"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </div>



                  <Button
                    onClick={guardar}
                    disabled={faltanRecetas || guardando}
                    className="w-full shadow-sm sm:w-auto"
                  >
                    <Save className="h-4 w-4" />
                    {guardando ? "Guardando..." : "Guardar menú"}
                  </Button>

                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <RecetaPreviewModal
        ingredientesCatalogo={ingredientesCatalogo}
        receta={previewReceta?.receta ?? null}
        dia={previewReceta?.dia}
        tipo={previewReceta?.tipo}
        isOpen={previewReceta !== null}
        onClose={() => setPreviewReceta(null)}
        sustitucionesConfirmadas={
          previewReceta
            ? menu?.find((d) => d.dia === previewReceta.dia)
                ?.sustituciones?.[previewReceta.tipo] ?? []
            : []
        }
        onConfirmarSustitucion={confirmarSustitucion}
        onReemplazar={(dia, tipo) => {
          reemplazar(dia, tipo);
          setPreviewReceta(null);
        }}
      />
    </AppLayout>
  );
}