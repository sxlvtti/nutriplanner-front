import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { RefreshCw, Sparkles, Shuffle, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/np/AppLayout";
import { Button, Card, Chip, PageHeader, comidaTexto } from "@/components/np/ui";
import { recetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { recetaApta, ingredienteProhibido, nombreIngrediente } from "@/lib/restricciones";
import type { Menu, TipoComida } from "@/types";
export const Route = createFileRoute("/generador")({ component: Generador });
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]; const TIPOS = Object.keys(comidaTexto) as TipoComida[];
function Generador() {
  const { perfil, excluidas, guardarMenu } = useApp();
  const navigate = useNavigate();

  const [cantDias, setCantDias] = useState(3);
  const [comidas, setComidas] = useState<TipoComida[]>([
    "DESAYUNO", "ALMUERZO", "CENA",
  ]);

  const [menu, setMenu] = useState<Menu["dias"] | null>(null);
  const [nombre, setNombre] = useState("Mi menú semanal");
  const [aviso, setAviso] = useState("");

  // RECETAS DISPONIBLES
  const opciones = (tipo: TipoComida) =>
    recetas.filter(
      (r) =>
        r.tipos_comida.includes(tipo) &&
        recetaApta(r, perfil) &&
        !excluidas.includes(r.id)
    );

  // INGREDIENTES QUE NECESITAN SUSTITUCIÓN
  const ingredientesPendientes = (
    dia: Menu["dias"][number],
    tipo: TipoComida
  ) => {
    const receta = recetas.find((r) => r.id === dia.comidas[tipo]);
    if (!receta) return [];

    const confirmadas = dia.sustituciones?.[tipo] ?? [];

    return receta.ingredientes.filter((ri) => {
      if (!ingredienteProhibido(ri.ingrediente_id, perfil)) {
        return false;
      }

      return !confirmadas.some(
        (s) =>
          s.ingrediente_original_id === ri.ingrediente_id &&
          s.ingrediente_alternativo_id === ri.sustituto_id &&
          ri.sustituto_id != null &&
          !ingredienteProhibido(ri.sustituto_id, perfil)
      );
    });
  };

  // GENERAR MENÚ
  const generar = () => {
    const usados = new Set<number>();
    let faltantes = false;

    const dias: Menu["dias"] = DIAS.slice(0, cantDias).map((dia) => {
      const c: Menu["dias"][number]["comidas"] = {};

      comidas.forEach((tipo) => {
        const disponibles = opciones(tipo);
        const sinRepetir = disponibles.filter(
          (r) => !usados.has(r.id)
        );

        const candidatos = sinRepetir.length
          ? sinRepetir
          : disponibles;

        const elegida = candidatos[
          Math.floor(Math.random() * candidatos.length)
        ];

        if (elegida) {
          c[tipo] = elegida.id;
          usados.add(elegida.id);
        } else {
          faltantes = true;
        }
      });

      return {
        dia,
        comidas: c,
        sustituciones: {},
      };
    });

    setAviso(
      faltantes
        ? "No hay suficientes recetas compatibles para completar todas las comidas."
        : ""
    );

    setMenu(dias);
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

    setAviso("");
  };

  // CONFIRMAR SUSTITUCIÓN EXPLÍCITA
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

    const ingrediente = receta?.ingredientes.find(
      (ri) => ri.ingrediente_id === originalId
    );

    // Validar la alternativa antes de registrarla
    if (
      !ingrediente ||
      ingrediente.sustituto_id !== alternativoId ||
      !ingredienteProhibido(originalId, perfil) ||
      ingredienteProhibido(alternativoId, perfil)
    ) {
      return;
    }

    setMenu((prev) =>
      prev?.map((d) => {
        if (d.dia !== dia) return d;

        const anteriores = d.sustituciones?.[tipo] ?? [];

        return {
          ...d,
          sustituciones: {
            ...d.sustituciones,
            [tipo]: [
              ...anteriores.filter(
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

  const faltanRecetas = menu
    ? menu.some((dia) =>
        comidas.some((tipo) => dia.comidas[tipo] == null)
      )
    : false;

  // GUARDAR SOLAMENTE SI ESTÁ COMPLETO
  const guardar = () => {
    if (!menu || pendientes > 0 || faltanRecetas) return;

    guardarMenu({
      nombre: nombre.trim() || "Menú sin nombre",
      dias: menu,
    });

    navigate({ to: "/menus" });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Generar menú"
        subtitle="Elegí entre 1 y 7 días y las comidas que querés incluir."
      />

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">

        {/* CONFIGURACIÓN */}
        <Card className="h-fit space-y-6">
          <div>
            <div className="mb-2 text-sm font-semibold">
              Cantidad de días: {cantDias}
            </div>

            <input
              type="range"
              min={1}
              max={7}
              value={cantDias}
              onChange={(e) => {
                setCantDias(+e.target.value);
                setMenu(null);
              }}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold">
              Comidas a incluir
            </div>

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
                  }}
                >
                  {comidaTexto[tipo]}
                </Chip>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={generar}
            disabled={!comidas.length}
          >
            {menu ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {menu ? "Volver a generar" : "Generar menú"}
          </Button>
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
                {menu.map((dia) => (
                  <Card key={dia.dia} className="p-4">
                    <div className="mb-3 font-display text-lg font-semibold">
                      {dia.dia}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {comidas.map((tipo) => {
                        const receta = recetas.find(
                          (r) => r.id === dia.comidas[tipo]
                        );

                        const pendientesComida =
                          ingredientesPendientes(dia, tipo);

                        return (
                          <div
                            key={tipo}
                            className="rounded-xl bg-secondary p-3"
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {comidaTexto[tipo]}
                            </div>

                            {receta ? (
                              <>
                                <Link
                                  to="/recetas/$id"
                                  params={{ id: String(receta.id) }}
                                  className="mt-1 block text-sm font-medium hover:text-primary"
                                >
                                  {receta.nombre}
                                </Link>

                                {pendientesComida.length > 0 ? (
                                  <div className="mt-3 space-y-3">
                                    <div className="flex items-center gap-1 text-xs text-warning">
                                      <AlertTriangle className="h-4 w-4" />
                                      Sustitución pendiente
                                    </div>

                                    {pendientesComida.map((ri) => (
                                      <div
                                        key={ri.ingrediente_id}
                                        className="rounded-lg border bg-card p-2 text-xs"
                                      >
                                        <p className="font-medium">
                                          {nombreIngrediente(ri.ingrediente_id)}
                                        </p>

                                        {ri.sustituto_id != null &&
                                        !ingredienteProhibido(
                                          ri.sustituto_id,
                                          perfil
                                        ) ? (
                                          <>
                                            <p className="mt-1 text-muted-foreground">
                                              Alternativa:{" "}
                                              {nombreIngrediente(
                                                ri.sustituto_id
                                              )}
                                            </p>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                confirmarSustitucion(
                                                  dia.dia,
                                                  tipo,
                                                  ri.ingrediente_id,
                                                  ri.sustituto_id!
                                                )
                                              }
                                              className="mt-2 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground"
                                            >
                                              Confirmar sustitución
                                            </button>
                                          </>
                                        ) : (
                                          <p className="mt-1 text-destructive">
                                            No hay alternativa compatible.
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Sin sustituciones pendientes
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    reemplazar(dia.dia, tipo)
                                  }
                                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary"
                                >
                                  <Shuffle className="h-3 w-3" />
                                  Reemplazar
                                </button>
                              </>
                            ) : (
                              <div className="mt-1 text-sm text-muted-foreground">
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
              <Card className="mt-6 space-y-3">
                {pendientes > 0 && (
                  <p className="text-sm text-warning">
                    Tenés {pendientes} sustitución(es) pendiente(s).
                    Confirmalas antes de guardar el menú.
                  </p>
                )}

                {faltanRecetas && (
                  <p className="text-sm text-warning">
                    El menú tiene comidas sin receta asignada.
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />

                  <Button
                    onClick={guardar}
                    disabled={pendientes > 0 || faltanRecetas}
                  >
                    Guardar menú
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}