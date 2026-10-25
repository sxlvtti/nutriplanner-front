import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  Eye,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Sparkles,
  Utensils,
  AlertCircle,
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
import { recetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { recetaApta } from "@/lib/restricciones";
import { cn } from "@/lib/utils";
import type { Menu, Receta, TipoComida } from "@/types";

export const Route = createFileRoute("/generador")({ component: Generador });

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const TIPOS = Object.keys(comidaTexto) as TipoComida[];

function Generador() {
  const { perfil, excluidas, guardarMenu } = useApp();
  const navigate = useNavigate();

  const [cantDias, setCantDias] = useState(3);
  const [comidas, setComidas] = useState<TipoComida[]>([
    "DESAYUNO",
    "ALMUERZO",
    "CENA",
  ]);
  const [menu, setMenu] = useState<Menu["dias"] | null>(null);
  const [nombre, setNombre] = useState("Mi menú semanal");
  const [aviso, setAviso] = useState("");
  const [previewReceta, setPreviewReceta] = useState<{
    receta: Receta;
    dia?: string;
    tipo?: TipoComida;
  } | null>(null);

  const opciones = (tipo: TipoComida) =>
    recetas.filter(
      (r) =>
        r.tipos_comida.includes(tipo) &&
        recetaApta(r, perfil) &&
        !excluidas.includes(r.id),
    );

  const generar = () => {
    const usados = new Set<number>();
    let faltantes = false;

    const dias = DIAS.slice(0, cantDias).map((dia) => {
      const c: Menu["dias"][number]["comidas"] = {};
      comidas.forEach((t) => {
        const disponibles = opciones(t);
        const sinRepetir = disponibles.filter((r) => !usados.has(r.id));
        const pool = sinRepetir.length ? sinRepetir : disponibles;
        const elegida = pool[Math.floor(Math.random() * pool.length)];

        if (elegida) {
          c[t] = elegida.id;
          usados.add(elegida.id);
        } else {
          faltantes = true;
        }
      });
      return { dia, comidas: c };
    });

    setAviso(
      faltantes
        ? "No hay suficientes recetas compatibles para completar todas las comidas."
        : "",
    );
    setMenu(dias);
  };

  const reemplazar = (dia: string, tipo: TipoComida) => {
    if (!menu) return null;
    const disponibles = opciones(tipo);
    const usados = menu.flatMap((d) => Object.values(d.comidas));
    const nueva = disponibles.find((r) => !usados.includes(r.id)) ?? disponibles[0];

    if (!nueva) {
      setAviso(
        `No hay recetas compatibles para reemplazar el ${comidaTexto[tipo].toLowerCase()}.`,
      );
      return null;
    }

    setMenu(
      menu.map((d) =>
        d.dia === dia ? { ...d, comidas: { ...d.comidas, [tipo]: nueva.id } } : d,
      ),
    );
    return nueva;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Generar menú"
        subtitle="Configurá los días y comidas deseadas para planificar tu menú semanal personalizado."
      />

      <div className="space-y-8">
        {/* Barra superior de configuración en una sola fila */}
        <Card className="p-5 shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* 1. Selector de cantidad de días */}
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
                    onClick={() => setCantDias(n)}
                    className={cn(
                      "h-9 w-9 rounded-xl text-sm font-semibold transition-all",
                      cantDias === n
                        ? "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Selector de comidas a incluir */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comidas a incluir
              </span>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => {
                  const activa = comidas.includes(t);
                  return (
                    <Chip
                      key={t}
                      active={activa}
                      onClick={() =>
                        setComidas(
                          activa
                            ? comidas.filter((x) => x !== t)
                            : [...comidas, t],
                        )
                      }
                    >
                      {comidaTexto[t]}
                    </Chip>
                  );
                })}
              </div>
            </div>

            {/* 3. Botón de acción para generar */}
            <div className="flex items-center pt-2 lg:pt-0">
              <Button
                onClick={generar}
                disabled={!comidas.length}
                className="w-full lg:w-auto shadow-sm"
              >
                {menu ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {menu ? "Volver a generar" : "Generar menú"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Mensaje de advertencia si faltan recetas */}
        {aviso && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{aviso}</span>
          </div>
        )}

        {/* Estado inicial sin menú generado */}
        {!menu ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
              <Utensils className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">
              Tu menú aparecerá aquí
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Seleccioná los días y las comidas en la barra superior y presioná
              en <span className="font-semibold text-foreground">"Generar menú"</span> para
              crear tus combinaciones de recetas aptas.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Contenedor de días */}
            <div className="space-y-8">
              {menu.map((d, index) => (
                <div key={d.dia} className="space-y-4">
                  {/* Encabezado del día (diferenciado si es mayor a 1 día) */}
                  {menu.length > 1 ? (
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                          {index + 1}
                        </span>
                        <div>
                          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                            {d.dia}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Día {index + 1} de {menu.length}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                        {comidas.length} {comidas.length === 1 ? "comida" : "comidas"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border-b border-border pb-3">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                        {d.dia}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        · Plan para 1 día
                      </span>
                    </div>
                  )}

                  {/* Grilla de Cards con Preview de las comidas */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {comidas.map((tipo) => {
                      const idReceta = d.comidas[tipo];
                      const r = recetas.find((x) => x.id === idReceta);

                      return (
                        <div
                          key={tipo}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                        >
                          {/* Header de la card con el tipo de comida */}
                          <div className="flex items-center justify-between border-b border-border/50 bg-secondary/50 px-4 py-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                              {comidaTexto[tipo]}
                            </span>
                            {r && (
                              <span className="text-xs text-muted-foreground">
                                {nivelTexto[r.dificultad]}
                              </span>
                            )}
                          </div>

                          {r ? (
                            <>
                              {/* Preview con Imagen clickeable */}
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewReceta({
                                    receta: r,
                                    dia: d.dia,
                                    tipo,
                                  })
                                }
                                className="group/thumb relative aspect-[16/10] w-full overflow-hidden bg-muted text-left focus:outline-none"
                                title={`Ver detalles de ${r.nombre}`}
                              >
                                <img
                                  src={r.imagen}
                                  alt={r.nombre}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover/thumb:opacity-100">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur">
                                    <Eye className="h-3.5 w-3.5 text-primary" />
                                    Ver receta
                                  </span>
                                </div>
                              </button>

                              {/* Contenido y detalles de la receta */}
                              <div className="flex flex-1 flex-col justify-between p-4">
                                <div className="space-y-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewReceta({
                                        receta: r,
                                        dia: d.dia,
                                        tipo,
                                      })
                                    }
                                    className="text-left line-clamp-2 font-display text-base font-semibold leading-snug text-foreground hover:text-primary transition-colors focus:outline-none"
                                  >
                                    {r.nombre}
                                  </button>

                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium">
                                      <Clock className="h-3.5 w-3.5 text-primary" />
                                      {r.tiempo_preparacion} min
                                    </span>
                                    {r.info_nutricional && (
                                      <>
                                        <span>·</span>
                                        <span className="truncate">
                                          {r.info_nutricional.split("·")[0]}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Botones para ver receta y reemplazar la opción */}
                                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewReceta({
                                        receta: r,
                                        dia: d.dia,
                                        tipo,
                                      })
                                    }
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-2.5 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary active:scale-[0.98]"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-primary" />
                                    Ver receta
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => reemplazar(d.dia, tipo)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-2.5 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary active:scale-[0.98]"
                                  >
                                    <Shuffle className="h-3.5 w-3.5" />
                                    Reemplazar
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
                              <AlertCircle className="h-8 w-8 text-warning mb-2" />
                              <p className="text-sm font-medium">
                                Sin recetas aptas
                              </p>
                              <p className="mt-1 text-xs">
                                No se encontró una receta compatible para esta comida.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Barra inferior para guardar menú */}
            <Card className="flex flex-col gap-4 p-5 shadow-card sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nombre del menú
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Menú semanal saludable"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="sm:self-end">
                <Button
                  onClick={() => {
                    guardarMenu({
                      nombre: nombre.trim() || "Menú semanal",
                      dias: menu,
                    });
                    navigate({ to: "/menus" });
                  }}
                  className="w-full sm:w-auto shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  Guardar menú
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Modal de Vista Previa de Receta */}
      <RecetaPreviewModal
        receta={previewReceta?.receta ?? null}
        dia={previewReceta?.dia}
        tipo={previewReceta?.tipo}
        isOpen={Boolean(previewReceta)}
        onClose={() => setPreviewReceta(null)}
        onReemplazar={(dia, tipo) => {
          const nueva = reemplazar(dia, tipo);
          if (nueva) {
            setPreviewReceta({ receta: nueva, dia, tipo });
          }
        }}
      />
    </AppLayout>
  );
}
