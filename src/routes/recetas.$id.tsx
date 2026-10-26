import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Clock, Repeat } from "lucide-react";
import { AppLayout } from "@/components/np/AppLayout";
import { Badge, Card, comidaTexto, nivelTexto } from "@/components/np/ui";
import { recetas } from "@/data/mock";
import { useApp } from "@/lib/app-state";
import { nombreIngrediente, recetaApta, resolverIngrediente } from "@/lib/restricciones";

export const Route = createFileRoute("/recetas/$id")({
  head: ({ params }) => {
    const r = recetas.find((x) => String(x.id) === params.id);
    const title = r ? `${r.nombre} — NutriPlanner` : "Receta — NutriPlanner";
    const description = r ? `Ingredientes, pasos y sustituciones de ${r.nombre}.` : "Detalle de receta.";
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

function Detalle() {
  const { id } = Route.useParams();
  const { perfil } = useApp();
  const router = useRouter();
  const navigate = useNavigate();
  const r = recetas.find((x) => String(x.id) === id);

  const volverAtras = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/recetas" });
    }
  };

  return (
    <AppLayout>
      <button
        type="button"
        onClick={volverAtras}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </button>
      {!r ? (
        <p>Receta no encontrada.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <img src={r.imagen} alt={r.nombre} width={1024} height={768} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card" />
          <div>
            <div className="flex flex-wrap gap-1.5">{r.tipos_comida.map((t) => <Badge key={t}>{comidaTexto[t]}</Badge>)}</div>
            <h1 className="mt-3 text-4xl font-semibold">{r.nombre}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{r.tiempo_preparacion} min</span>
              <span>·</span><span>{nivelTexto[r.dificultad]}</span>
            </div>
            {r.info_nutricional && <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary">{r.info_nutricional}</p>}
            {!recetaApta(r, perfil) && (
              <p className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
                Esta receta no es apta para tu perfil (por ingredientes o nivel culinario).
              </p>
            )}

            <Card className="mt-6">
              <h2 className="mb-3 text-xl font-semibold">Ingredientes</h2>
              <ul className="divide-y">
                {r.ingredientes.map((ri) => {
                  const res = resolverIngrediente(ri, perfil);
                  return (
                    <li key={ri.ingrediente_id} className="flex items-center justify-between py-2.5 text-sm">
                      <span>
                        {res?.sustituido ? (
                          <>
                            <span className="text-muted-foreground line-through">{nombreIngrediente(ri.ingrediente_id)}</span>{" "}
                            <span className="inline-flex items-center gap-1 font-medium text-primary"><Repeat className="h-3.5 w-3.5" />{nombreIngrediente(res.id)}</span>
                          </>
                        ) : (
                          <span className={res ? "" : "text-destructive"}>{nombreIngrediente(ri.ingrediente_id)}</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">{ri.cantidad}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
          <Card className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">Preparación</h2>
            <ol className="space-y-3">
              {r.pasos.split("\n").map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <span className="pt-0.5">{p}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
