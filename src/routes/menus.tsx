import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Copy,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { AppLayout } from "@/components/np/AppLayout";
import { Button, Card, PageHeader, comidaTexto } from "@/components/np/ui";
import { recetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { recetaApta } from "@/lib/restricciones";
import type { TipoComida } from "@/types";

const ORDEN_COMIDAS: TipoComida[] = ["DESAYUNO", "ALMUERZO", "MERIENDA", "CENA"];

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
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Todavía no guardaste menús
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Armá tu primer plan semanal en el generador adaptado a tus preferencias y restricciones.
          </p>
          <Link to="/generador" className="mt-5">
            <Button>Crear menú ahora</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {menus.map((m) => {
            const invalidos = m.dias
              .flatMap((d) => Object.values(d.comidas))
              .filter((id) => {
                if (!id) return false;
                const r = recetas.find((x) => x.id === id);
                return !r || !recetaApta(r, perfil);
              }).length;

            const tiposPresentes = ORDEN_COMIDAS.filter((tipo) =>
              m.dias.some((d) => d.comidas[tipo] !== undefined)
            );

            return (
              <Card
                key={m.id}
                className="overflow-hidden p-6 transition-all shadow-card hover:shadow-lift"
              >
                {/* Cabecera del menú */}
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      {m.nombre}
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        {m.dias.length} {m.dias.length === 1 ? "día" : "días"}
                      </span>
                      <span>·</span>
                      <span>
                        creado el {new Date(m.creado).toLocaleDateString("es-AR")}
                      </span>
                    </div>

                    {invalidos > 0 && (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-warning pt-1">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {invalidos} receta(s) ya no son compatibles con tu perfil actual.
                      </p>
                    )}
                  </div>

                  {/* Acciones del menú */}
                  <div className="flex items-center gap-2 self-start">
                    <Button
                      variant="ghost"
                      onClick={() => navigate({ to: "/generador" })}
                      aria-label="Reutilizar menú"
                      className="h-9 px-3 text-xs"
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Reutilizar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        window.confirm("¿Querés eliminar este menú?") &&
                        borrarMenu(m.id)
                      }
                      aria-label="Eliminar menú"
                      className="h-9 w-9 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Tabla detallada con miniaturas de recetas */}
                <div className="overflow-x-auto rounded-xl border border-border/50 bg-secondary/20">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-secondary/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="w-28 px-4 py-3 font-semibold">Día</th>
                        {tiposPresentes.map((t) => (
                          <th key={t} className="px-4 py-3 font-semibold">
                            {comidaTexto[t]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-card">
                      {m.dias.map((d) => (
                        <tr
                          key={d.dia}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="w-28 px-4 py-3 font-semibold text-foreground align-middle">
                            <span className="inline-block rounded-md bg-secondary/80 px-2.5 py-1 text-xs font-medium">
                              {d.dia}
                            </span>
                          </td>
                          {tiposPresentes.map((tipo) => {
                            const id = d.comidas[tipo];
                            const r = id
                              ? recetas.find((x) => x.id === id)
                              : undefined;

                            if (!r) {
                              return (
                                <td
                                  key={tipo}
                                  className="px-4 py-3 text-xs text-muted-foreground/60 align-middle"
                                >
                                  —
                                </td>
                              );
                            }

                            const esApta = recetaApta(r, perfil);

                            return (
                              <td key={tipo} className="px-4 py-3 align-middle">
                                <Link
                                  to="/recetas/$id"
                                  params={{ id: String(r.id) }}
                                  className="group flex items-center gap-3 rounded-xl p-1.5 -ml-1.5 transition-all duration-200 hover:bg-secondary/70 focus:outline-none"
                                >
                                  {/* Miniatura de la receta */}
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-xs">
                                    <img
                                      src={r.imagen}
                                      alt={r.nombre}
                                      loading="lazy"
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                    {!esApta && (
                                      <span
                                        className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-background"
                                        title="Receta no compatible con tu perfil actual"
                                      />
                                    )}
                                  </div>

                                  {/* Nombre y tiempo */}
                                  <div className="min-w-0 max-w-[150px]">
                                    <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                                      {r.nombre}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3 text-primary/70" />
                                      {r.tiempo_preparacion} min
                                    </span>
                                  </div>
                                </Link>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
