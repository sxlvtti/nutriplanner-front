import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { AppLayout } from "@/components/np/AppLayout";
import { RecetaCard } from "@/components/np/RecetaCard";
import { Chip, PageHeader, comidaTexto, nivelTexto } from "@/components/np/ui";
import { recetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { estadoReceta } from "@/lib/restricciones";
import type { NivelDificultad, TipoComida } from "@/types";

export type EstadoFiltro = "TODAS" | "COMPATIBLE" | "SUSTITUCION" | "NO_DISPONIBLE";

export interface RecetasSearch {
  q?: string | undefined;
  tipo?: TipoComida | undefined;
  nivel?: NivelDificultad | undefined;
  estado?: EstadoFiltro | undefined;
  soloFavoritas?: boolean | undefined;
}

export const Route = createFileRoute("/recetas/")({
  validateSearch: (search: Record<string, unknown>): RecetasSearch => {
    const rawQ = search["q"];
    const rawTipo = search["tipo"];
    const rawNivel = search["nivel"];
    const rawEstado = search["estado"];
    const rawSoloFavoritas = search["soloFavoritas"];

    const q = typeof rawQ === "string" && rawQ.trim() !== "" ? rawQ : undefined;
    const tipo =
      typeof rawTipo === "string" &&
      ["DESAYUNO", "ALMUERZO", "MERIENDA", "CENA"].includes(rawTipo)
        ? (rawTipo as TipoComida)
        : undefined;
    const nivel =
      typeof rawNivel === "string" &&
      ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"].includes(rawNivel)
        ? (rawNivel as NivelDificultad)
        : undefined;
    const estado =
      typeof rawEstado === "string" &&
      ["COMPATIBLE", "SUSTITUCION", "NO_DISPONIBLE"].includes(rawEstado)
        ? (rawEstado as EstadoFiltro)
        : undefined;
    const soloFavoritas =
      rawSoloFavoritas === true || rawSoloFavoritas === "true" ? true : undefined;

    return {
      ...(q !== undefined ? { q } : {}),
      ...(tipo !== undefined ? { tipo } : {}),
      ...(nivel !== undefined ? { nivel } : {}),
      ...(estado !== undefined ? { estado } : {}),
      ...(soloFavoritas ? { soloFavoritas: true } : {}),
    };
  },
  component: Catalogo,
});

function Catalogo() {
  const { perfil, favoritas, excluidas } = useApp();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(search.q ?? "");

  // Sincronizar el input si los search params cambian externamente (ej: botón atrás del navegador)
  useEffect(() => {
    if ((search.q ?? "") !== searchInput.trim()) {
      setSearchInput(search.q ?? "");
    }
  }, [search.q]);

  const updateFilters = (next: Partial<RecetasSearch>) => {
    navigate({
      to: "/recetas",
      search: (prev: RecetasSearch) => {
        const merged: RecetasSearch = { ...prev, ...next };
        const cleaned: RecetasSearch = {};

        if (merged.q && merged.q.trim()) cleaned.q = merged.q.trim();
        if (merged.tipo) cleaned.tipo = merged.tipo;
        if (merged.nivel) cleaned.nivel = merged.nivel;
        if (merged.estado && merged.estado !== "TODAS") cleaned.estado = merged.estado;
        if (merged.soloFavoritas) cleaned.soloFavoritas = true;

        return cleaned;
      },
      replace: true,
    });
  };

  // Debounce para sincronizar búsqueda de texto en la URL al tipear
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== (search.q ?? "")) {
        updateFilters({ q: trimmed || undefined });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput, search.q]);

  const tipo = search.tipo ?? null;
  const nivel = search.nivel ?? null;
  const estado = search.estado ?? "TODAS";
  const soloFavoritas = search.soloFavoritas ?? false;

  const hayFiltrosActivos = Boolean(
    searchInput.trim() ||
      tipo ||
      nivel ||
      (estado && estado !== "TODAS") ||
      soloFavoritas
  );

  const activeFilterCount =
    (searchInput.trim() ? 1 : 0) +
    (tipo ? 1 : 0) +
    (nivel ? 1 : 0) +
    (estado !== "TODAS" ? 1 : 0) +
    (soloFavoritas ? 1 : 0);

  const resetFilters = () => {
    setSearchInput("");
    navigate({
      to: "/recetas",
      search: () => ({}),
      replace: true,
    });
  };

  const lista = useMemo(() => {
    const qLower = searchInput.trim().toLowerCase();
    return recetas.filter(
      (r) =>
        (!qLower || r.nombre.toLowerCase().includes(qLower)) &&
        (!tipo || r.tipos_comida.includes(tipo)) &&
        (!nivel || r.dificultad === nivel) &&
        (estado === "TODAS" || estadoReceta(r, perfil) === estado) &&
        (!soloFavoritas || favoritas.includes(r.id)) &&
        !excluidas.includes(r.id)
    );
  }, [searchInput, tipo, nivel, estado, soloFavoritas, perfil, favoritas, excluidas]);

  return (
    <AppLayout>
      <PageHeader
        title="Recetas"
        subtitle={`${lista.length} ${lista.length === 1 ? "receta encontrada" : "recetas encontradas"}`}
      >
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Restablecer todos los filtros"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer filtros
            {activeFilterCount > 1 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-semibold text-destructive">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </PageHeader>

      <div className="mb-8 space-y-4 rounded-2xl border bg-card p-4 shadow-card">
        {/* Campo de búsqueda con botón de limpieza inmediata */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const trimmed = searchInput.trim();
                if (trimmed !== (search.q ?? "")) {
                  updateFilters({ q: trimmed || undefined });
                }
              }
            }}
            placeholder="Buscar receta…"
            className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-ring"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateFilters({ q: undefined });
              }}
              aria-label="Borrar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo de comida */}
          {(Object.keys(comidaTexto) as TipoComida[]).map((t) => (
            <Chip
              key={t}
              active={tipo === t}
              onClick={() => updateFilters({ tipo: tipo === t ? undefined : t })}
            >
              {comidaTexto[t]}
            </Chip>
          ))}

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Dificultad */}
          {(Object.keys(nivelTexto) as NivelDificultad[]).map((n) => (
            <Chip
              key={n}
              active={nivel === n}
              onClick={() => updateFilters({ nivel: nivel === n ? undefined : n })}
            >
              {nivelTexto[n]}
            </Chip>
          ))}

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Estado de compatibilidad según restricciones */}
          <select
            value={estado}
            onChange={(e) => {
              const val = e.target.value as EstadoFiltro;
              updateFilters({ estado: val === "TODAS" ? undefined : val });
            }}
            className="rounded-full border border-input bg-card px-3 py-1.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
          >
            <option value="TODAS">Todos los estados</option>
            <option value="COMPATIBLE">Compatibles</option>
            <option value="SUSTITUCION">Con sustitución</option>
            <option value="NO_DISPONIBLE">No disponibles</option>
          </select>

          {/* Filtro de recetas favoritas */}
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={soloFavoritas}
              onChange={(e) =>
                updateFilters({ soloFavoritas: e.target.checked ? true : undefined })
              }
              className="h-4 w-4 rounded accent-primary"
            />
            Solo favoritas
          </label>

          {/* Botón rápido para restablecer en la misma barra de filtros */}
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3" />
              Restablecer
            </button>
          )}
        </div>
      </div>

      {lista.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((r) => (
            <RecetaCard key={r.id} receta={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/40 py-16 text-center">
          <p className="text-muted-foreground">No hay recetas con esos filtros.</p>
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              Restablecer filtros
            </button>
          )}
        </div>
      )}
    </AppLayout>
  );
}
