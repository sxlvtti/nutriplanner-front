import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  Copy,
  Plus,
  Trash2,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import { AppLayout } from "@/components/np/AppLayout";
import { Button, Card, PageHeader, comidaTexto } from "@/components/np/ui";
import { recetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { recetaApta } from "@/lib/restricciones";
import type { TipoComida } from "@/types";

export const Route = createFileRoute("/menus")({ component: Menus });

function Menus() {
  const { menus, borrarMenu, perfil } = useApp();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Mis menús"
        subtitle={`${menus.length} ${menus.length === 1 ? "menú guardado" : "menús guardados"}`}
      >
        <Link to="/generador">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo menú
          </Button>
        </Link>
      </PageHeader>

      {menus.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/50 px-4 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Todavía no guardaste ningún menú
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Generá un plan semanal personalizado según tus tiempos, preferencias y restricciones alimentarias.
          </p>
          <Link to="/generador" className="mt-6">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Crear mi primer menú
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {menus.map((m) => {
            const invalidos = m.dias
              .flatMap((d) => Object.values(d.comidas))
              .filter((id) => {
                const r = recetas.find((x) => x.id === id);
                return !r || !recetaApta(r, perfil);
              }).length;

            return (
              <Card key={m.id} className="space-y-6 p-5 sm:p-6 shadow-card">
                {/* Cabecera del menú guardado */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                      {m.nombre}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {m.dias.length} {m.dias.length === 1 ? "día" : "días"} · Creado el{" "}
                      {new Date(m.creado).toLocaleDateString("es-AR")}
                    </p>

                    {invalidos > 0 && (
                      <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {invalidos} receta(s) ya no son compatibles con tu perfil.
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start">
                    <Button
                      variant="ghost"
                      onClick={() => navigate({ to: "/generador" })}
                      aria-label="Reutilizar menú"
                      title="Reutilizar menú"
                      className="h-9 w-9 rounded-xl p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        window.confirm("¿Querés eliminar este menú?") &&
                        borrarMenu(m.id)
                      }
                      aria-label="Eliminar menú"
                      title="Eliminar menú"
                      className="h-9 w-9 rounded-xl p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Días del menú (separados con claridad y responsivos) */}
                <div className="space-y-6">
                  {m.dias.map((d, diaIdx) => {
                    const comidasList = Object.entries(d.comidas) as [
                      TipoComida,
                      number,
                    ][];

                    return (
                      <div
                        key={d.dia}
                        className="space-y-3 rounded-2xl border border-border/50 bg-secondary/20 p-4"
                      >
                        {/* Encabezado del día: separador visual claro */}
                        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            {m.dias.length > 1 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                                {diaIdx + 1}
                              </span>
                            )}
                            <h3 className="font-display text-base font-bold text-foreground">
                              {d.dia}
                            </h3>
                          </div>

                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {comidasList.length}{" "}
                            {comidasList.length === 1 ? "comida" : "comidas"}
                          </span>
                        </div>

                        {/* Lista de comidas: vertical en mobile (1 col), grilla en desktop */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {comidasList.map(([tipo, id]) => {
                            const r = recetas.find((x) => x.id === id);
                            const apta = r ? recetaApta(r, perfil) : true;

                            if (!r) {
                              return (
                                <div
                                  key={tipo}
                                  className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/60 p-2.5"
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <Utensils className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      {comidaTexto[tipo]}
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                      Receta no disponible
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={tipo}
                                className="group flex items-center gap-3 rounded-xl border border-border/80 bg-card p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                              >
                                {/* Mini imagen preview */}
                                <Link
                                  to="/recetas/$id"
                                  params={{ id: String(r.id) }}
                                  className="group/img relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted"
                                  title={`Ver receta de ${r.nombre}`}
                                >
                                  <img
                                    src={r.imagen}
                                    alt={r.nombre}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                                  />
                                </Link>

                                {/* Información de la comida */}
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {comidaTexto[tipo]}
                                  </span>

                                  <Link
                                    to="/recetas/$id"
                                    params={{ id: String(r.id) }}
                                    className="block truncate font-semibold text-sm text-foreground transition-colors hover:text-primary"
                                    title={r.nombre}
                                  >
                                    {r.nombre}
                                  </Link>

                                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1 font-medium">
                                      <Clock className="h-3 w-3 text-primary" />
                                      {r.tiempo_preparacion} min
                                    </span>

                                    {!apta && (
                                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                                        Incompatible
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
