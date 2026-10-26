import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { AppLayout } from "@/components/np/AppLayout";
import { RecetaCard } from "@/components/np/RecetaCard";
import { Button, Chip, PageHeader, comidaTexto, nivelTexto } from "@/components/np/ui";
import { recetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { estadoReceta } from "@/lib/restricciones";
import type { NivelDificultad, TipoComida } from "@/types";

export interface RecetasSearch {
  q?: string | undefined;
  tipo?: TipoComida | undefined;
  nivel?: NivelDificultad | undefined;
  estado?: "TODAS" | "COMPATIBLE" | "SUSTITUCION" | "NO_DISPONIBLE" | undefined;
  favoritas?: boolean | undefined;
}

export const Route = createFileRoute("/recetas/")({
  validateSearch: (search: Record<string, unknown>): RecetasSearch => {
    const rawQ = search["q"];
    const rawTipo = search["tipo"];
    const rawNivel = search["nivel"];
    const rawEstado = search["estado"];
    const rawFavoritas = search["favoritas"];

    const q = typeof rawQ === "string" && rawQ.trim() !== "" ? rawQ : undefined;
    const tipo =
      typeof rawTipo === "string" && ["DESAYUNO", "ALMUERZO", "MERIENDA", "CENA"].includes(rawTipo)
        ? (rawTipo as TipoComida)
        : undefined;
    const nivel =
      typeof rawNivel === "string" && ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"].includes(rawNivel)
        ? (rawNivel as NivelDificultad)
        : undefined;
    const estado =
      typeof rawEstado === "string" && ["COMPATIBLE", "SUSTITUCION", "NO_DISPONIBLE"].includes(rawEstado)
        ? (rawEstado as "COMPATIBLE" | "SUSTITUCION" | "NO_DISPONIBLE")
        : undefined;
    const favoritas = rawFavoritas === true || rawFavoritas === "true" ? true : undefined;

    return {
      q,
      tipo,
      nivel,
      estado,
      favoritas,
    };
  },
  component: Catalogo,
});

function Catalogo() {
  const { perfil, favoritas, excluidas } = useApp();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState(search.q ?? "");

  // Sincronizar el input si la URL cambia por navegación (ej. volver atrás / adelante)
  useEffect(() => {
    setBusqueda(search.q ?? "");
  }, [search.q]);

  const tipo = search.tipo ?? null;
  const nivel = search.nivel ?? null;
  const estado = search.estado ?? "TODAS";
  const soloFavoritas = Boolean(search.favoritas);

  const hayFiltrosActivos = Boolean(
    (search.q && search.q.trim()) || search.tipo || search.nivel || search.estado || search.favoritas
  );

  const lista = useMemo(() => {
    const query = (search.q ?? "").trim().toLowerCase();
    return recetas.filter(
      (r) =>
        r.nombre.toLowerCase().includes(query) &&
        (!tipo || r.tipos_comida.includes(tipo)) &&
        (!nivel || r.dificultad === nivel) &&
        (estado === "TODAS" || estadoReceta(r, perfil) === estado) &&
        (!soloFavoritas || favoritas.includes(r.id)) &&
        !excluidas.includes(r.id)
    );
  }, [search.q, tipo, nivel, estado, soloFavoritas, perfil, favoritas, excluidas]);

  const handleSearchChange = (val: string) => {
    setBusqueda(val);
    navigate({
      to: "/recetas",
      search: (prev) => ({
        ...prev,
        q: val.trim() ? val : undefined,
      }),
      replace: true,
    });
  };

  const handleTipoClick = (t: TipoComida) => {
    navigate({
      to: "/recetas",
      search: (prev) => ({
        ...prev,
        tipo: prev.tipo === t ? undefined : t,
      }),
      replace: true,
    });
  };

  const handleNivelClick = (n: NivelDificultad) => {
    navigate({
      to: "/recetas",
      search: (prev) => ({
        ...prev,
        nivel: prev.nivel === n ? undefined : n,
      }),
      replace: true,
    });
  };

  const handleEstadoChange = (val: "TODAS" | "COMPATIBLE" | "SUSTITUCION" | "NO_DISPONIBLE") => {
    navigate({
      to: "/recetas",
      search: (prev) => ({
        ...prev,
        estado: val === "TODAS" ? undefined : val,
      }),
      replace: true,
    });
  };

  const handleFavoritasChange = (checked: boolean) => {
    navigate({
      to: "/recetas",
      search: (prev) => ({
        ...prev,
        favoritas: checked ? true : undefined,
      }),
      replace: true,
    });
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    navigate({
      to: "/recetas",
      search: {},
      replace: true,
    });
  };

  return (
    <AppLayout>
      <PageHeader title="Recetas" subtitle={`${lista.length} recetas encontradas`}>
        {hayFiltrosActivos && (
          <Button variant="ghost" onClick={limpiarFiltros} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        )}
      </PageHeader>

      <div className="mb-8 space-y-4 rounded-2xl border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar receta…"
            className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(comidaTexto) as TipoComida[]).map((t) => (
            <Chip key={t} active={tipo === t} onClick={() => handleTipoClick(t)}>
              {comidaTexto[t]}
            </Chip>
          ))}

          <span className="mx-1 h-5 w-px bg-border" />

          {(Object.keys(nivelTexto) as NivelDificultad[]).map((n) => (
            <Chip key={n} active={nivel === n} onClick={() => handleNivelClick(n)}>
              {nivelTexto[n]}
            </Chip>
          ))}

          <select
            value={estado}
            onChange={(e) => handleEstadoChange(e.target.value as typeof estado)}
            className="rounded-full border bg-card px-3 py-1.5 text-sm"
          >
            <option value="TODAS">Todos los estados</option>
            <option value="COMPATIBLE">Compatibles</option>
            <option value="SUSTITUCION">Con sustitución</option>
            <option value="NO_DISPONIBLE">No disponibles</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloFavoritas}
              onChange={(e) => handleFavoritasChange(e.target.checked)}
              className="accent-primary"
            />
            Solo favoritas
          </label>
        </div>
      </div>

      {lista.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((r) => (
            <RecetaCard key={r.id} receta={r} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No hay recetas con esos filtros.</p>
          {hayFiltrosActivos && (
            <Button variant="outline" onClick={limpiarFiltros} className="mt-4 gap-1.5 text-xs">
              <RotateCcw className="h-4 w-4" />
              Restablecer filtros
            </Button>
          )}
        </div>
      )}
    </AppLayout>
  );
}
