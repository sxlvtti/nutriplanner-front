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
                className="overflow-hidden p-4 sm:p-6 transition-all shadow-card hover:shadow-lift"
              >
                {/* Cabecera del menú */}
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      {m.nombre}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
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
                      <p className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-warning pt-1">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {invalidos} receta(s) ya no son compatibles con tu perfil actual.
                      </p>
                    )}
                  </div>

                  {/* Acciones del menú */}
                  <div className="flex items-center gap-2 self-end sm:self-start">
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

                {/* Vista Mobile: En columna por día (ideal para menús de varios días) */}
                <div className="space-y-4 md:hidden">
                  {m.dias.map((d) => {
                    const comidasDelDia = tiposPresentes.filter(
                      (tipo) => d.comidas[tipo] !== undefined
                    );

                    return (
                      <div
                        key={d.dia}
                        className="rounded-xl border border-border/60 bg-secondary/15 p-3.5"
                      >
                        {/* Cabecera del día */}
                        <div className="mb-2.5 flex items-center justify-between border-b border-border/40 pb-2">
                          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-foreground">
                            {d.dia}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {comidasDelDia.length}{" "}
                            {comidasDelDia.length === 1 ? "comida" : "comidas"}
                          </span>
                        </div>

                        {/* Comidas del día en columna */}
                        <div className="space-y-2">
                          {comidasDelDia.map((tipo) => {
                            const id = d.comidas[tipo];
                            const r = id
                              ? recetas.find((x) => x.id === id)
                              : undefined;

                            if (!r) return null;

                            const esApta = recetaApta(r, perfil);

                            return (
                              <Link
                                key={tipo}
                                to="/recetas/$id"
                                params={{ id: String(r.id) }}
                                className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-2.5 shadow-xs transition-all active:scale-[0.99] hover:border-primary/40 focus:outline-none"
                              >
                                {/* Miniatura de la receta */}
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                                  <img
                                    src={r.imagen}
                                    alt={r.nombre}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  {!esApta && (
                                    <span
                                      className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-background"
                                      title="Receta no compatible con tu perfil actual"
                                    />
                                  )}
                                </div>

                                {/* Info de la comida */}
                                <div className="min-w-0 flex-1">
                                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary">
                                    {comidaTexto[tipo]}
                                  </span>
                                  <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                    {r.nombre}
                                  </span>
                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-primary/70" />
                                      {r.tiempo_preparacion} min
                                    </span>
                                    {!esApta && (
                                      <span className="text-[11px] font-medium text-warning">
                                        · No compatible
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista Desktop: Tabla horizontal con miniaturas */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-border/50 bg-secondary/20">
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
