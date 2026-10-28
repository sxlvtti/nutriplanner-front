import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/np/AppLayout";
import { PerfilForm } from "@/components/np/PerfilForm";
import { Card, PageHeader } from "@/components/np/ui";
import { useApp } from "@/lib/app-state";
import { api } from "@/services/api";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — NutriPlanner" },
      { name: "description", content: "Modificá tus preferencias alimentarias y datos de cuenta." },
      { property: "og:title", content: "Mi perfil — NutriPlanner" },
      { property: "og:description", content: "Modificá tus preferencias alimentarias y datos de cuenta." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { cuenta, perfil, setPerfil } = useApp();
  const [ok, setOk] = useState(false);
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Mi perfil" subtitle="Tus preferencias se aplican a recetas y menús." />
        <Card className="mb-6 flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft font-display text-xl font-semibold text-primary">
            {cuenta?.nombre_usuario?.charAt(0)?.toUpperCase() ?? ""}
          </div>
          <div>
            <div className="font-semibold">{cuenta?.nombre_usuario}</div>
            <div className="text-sm text-muted-foreground">{cuenta?.correo}</div>
          </div>
        </Card>
        {ok && <div className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary">Preferencias guardadas.</div>}
        <PerfilForm
          inicial={perfil}
          textoBoton="Guardar cambios"
          onGuardar={async (p) => {
            await setPerfil(p);
            setOk(true);
          }}
        />
      </div>
    </AppLayout>
  );
}
