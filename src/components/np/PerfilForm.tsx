// Formulario de perfil alimentario, usado en el onboarding y en "Perfil".
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RotateCcw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, getErrorMessage } from "@/services/api";
import type { Alergia, CategoriaAlimento, Ingrediente, NivelDificultad, PerfilAlimentario } from "@/types";
import { Button, Card, Chip, nivelTexto } from "./ui";

const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function PerfilForm({
  inicial,
  onGuardar,
  textoBoton,
}: {
  inicial: PerfilAlimentario;
  onGuardar: (p: PerfilAlimentario) => void | Promise<void>;
  textoBoton: string;
}) {
  const [p, setP] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [esErrorRed, setEsErrorRed] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAlimento[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  useEffect(() => {
    setP(inicial);
  }, [inicial]);

  const cargarCatalogos = useCallback(async () => {
    setCargandoCatalogos(true);
    setErrorCatalogo(null);
    setEsErrorRed(false);

    try {
      const [datosAlergias, datosCategorias, datosIngredientes] =
        await Promise.all([
          api.getAlergias(),
          api.getCategorias(),
          api.getIngredientes(),
        ]);

      setAlergias(datosAlergias);
      setCategorias(datosCategorias);
      setIngredientes(datosIngredientes);
    } catch (err) {
      const esRed = err instanceof ApiError ? err.isNetworkError : false;
      const mensaje = getErrorMessage(
        err,
        "No se pudieron cargar los catálogos del servidor. Comprobá tu conexión."
      );
      setEsErrorRed(esRed);
      setErrorCatalogo(mensaje);
      toast.error(mensaje, { id: "catalogo-error" });
    } finally {
      setCargandoCatalogos(false);
    }
  }, []);

  useEffect(() => {
    void cargarCatalogos();
  }, [cargarCatalogos]);

  const submit = async () => {
    if (guardando || cargandoCatalogos) return;

    setGuardando(true);
    setErrorGuardar(null);

    try {
      await onGuardar(p);
      toast.success("Perfil guardado con éxito.", { id: "perfil-guardado" });
    } catch (err) {
      const mensaje = getErrorMessage(
        err,
        "No se pudo guardar el perfil. Intentá nuevamente."
      );
      setErrorGuardar(mensaje);
      toast.error(mensaje, { id: "perfil-error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Alergias declaradas</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Nunca te sugeriremos recetas con estos alérgenos.</p>
        <div className="flex flex-wrap gap-2">
          {alergias.map((a) => (
            <Chip key={a.id} tone="warning" active={p.alergias.includes(a.id)} onClick={() => setP({ ...p, alergias: toggle(p.alergias, a.id) })}>
              {a.nombre}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Categorías que preferís evitar</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Por gusto o estilo de alimentación (ej. vegetariano).</p>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <Chip key={c.id} active={p.categorias_evitadas.includes(c.id)} onClick={() => setP({ ...p, categorias_evitadas: toggle(p.categorias_evitadas, c.id) })}>
              {c.nombre}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Ingredientes a evitar</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Si una receta los usa, buscaremos un sustituto.</p>
        <div className="flex flex-wrap gap-2">
          {ingredientes.map((i) => (
            <Chip key={i.id} active={p.ingredientes_evitados.includes(i.id)} onClick={() => setP({ ...p, ingredientes_evitados: toggle(p.ingredientes_evitados, i.id) })}>
              {i.nombre}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Nivel culinario</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(Object.keys(nivelTexto) as NivelDificultad[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setP({ ...p, nivel_culinario: n })}
              className={`rounded-xl border p-4 text-left transition ${p.nivel_culinario === n ? "border-primary bg-primary-soft" : "hover:border-primary/50"}`}
            >
              <div className="font-semibold">{nivelTexto[n]}</div>
              <div className="text-xs text-muted-foreground">
                {n === "PRINCIPIANTE" ? "Recetas simples y rápidas" : n === "INTERMEDIO" ? "Algunas técnicas extra" : "Cualquier receta"}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {errorCatalogo && (
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
                  No se pudieron cargar las opciones
                </p>
                <p className="text-sm text-destructive/90">{errorCatalogo}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void cargarCatalogos()}
              className="gap-1.5 self-start sm:self-center"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reintentar
            </Button>
          </div>
        )}

        {errorGuardar && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3.5 text-destructive"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider">Error al guardar</p>
                <p className="text-sm text-destructive/90">{errorGuardar}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={submit} disabled={guardando || cargandoCatalogos}>
            {cargandoCatalogos ? "Cargando opciones..." : guardando ? "Guardando..." : textoBoton}
          </Button>
        </div>
      </div>
    </div>
  );
}
