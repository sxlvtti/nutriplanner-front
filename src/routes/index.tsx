import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Leaf, AlertCircle, WifiOff } from "lucide-react";
import { toast } from "sonner";
import hero from "@/assets/receta-quinoa.jpg";
import { Button, Input } from "@/components/np/ui";
import { useApp } from "@/lib/app-state";
import { api, ApiError, getErrorMessage, USE_MOCK } from "@/services/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriPlanner — Iniciar sesión" },
      { name: "description", content: "Planificá tus comidas según tus alergias, preferencias y nivel culinario." },
      { property: "og:title", content: "NutriPlanner — Planificación alimentaria personalizada" },
      { property: "og:description", content: "Planificá tus comidas según tus alergias, preferencias y nivel culinario." },
    ],
  }),
  component: Acceso,
});

interface ErrorEstado {
  titulo: string;
  mensaje: string;
  esRed: boolean;
}

function Acceso() {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ErrorEstado | null>(null);
  const { iniciarSesion, cuenta, cargandoSesion } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!cargandoSesion && cuenta) {
      navigate({ to: "/recetas", replace: true });
    }
  }, [cuenta, cargandoSesion, navigate]);

  if (cargandoSesion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Recuperando sesión...
        </p>
      </div>
    );
  }

  const cambiarModo = (nuevoModo: "login" | "registro") => {
    setModo(nuevoModo);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (cargando) return;

    setCargando(true);
    setError(null);

    try {
      const res =
        modo === "login"
          ? await api.login(correo.trim(), password)
          : await api.registro(nombre.trim(), correo.trim(), password);

      await iniciarSesion(res.cuenta, res.token);

      toast.success(
        modo === "login" ? "¡Sesión iniciada con éxito!" : "¡Cuenta creada con éxito!",
        { id: "auth-toast" }
      );

      await navigate({
        to: modo === "registro" ? "/onboarding" : "/recetas",
      });
    } catch (err) {
      if (err instanceof ApiError) {
        let titulo = modo === "login" ? "No se pudo iniciar sesión" : "No se pudo crear la cuenta";
        if (err.isNetworkError) {
          titulo = "Servidor no disponible";
        } else if (err.status === 401 || err.status === 400) {
          titulo = modo === "login" ? "Credenciales incorrectas" : "Error en el registro";
        } else if (err.isValidationError) {
          titulo = "Datos inválidos o incompletos";
        } else if (err.isConflict) {
          titulo = "Cuenta existente";
        } else if (err.isServerError) {
          titulo = "Error en el servidor";
        }

        setError({
          titulo,
          mensaje: err.message,
          esRed: err.isNetworkError,
        });
        toast.error(err.message, { id: "auth-toast" });
      } else {
        const mensaje = getErrorMessage(
          err,
          "No se pudo completar la operación. Por favor, intentá nuevamente."
        );
        setError({
          titulo: "Ocurrió un error inesperado",
          mensaje,
          esRed: false,
        });
        toast.error(mensaje, { id: "auth-toast" });
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={hero} alt="Bowl de quinoa saludable" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-primary-foreground">
          <h2 className="text-4xl font-semibold leading-tight">Comer bien, sin pensar en lo que no podés comer.</h2>
          <p className="mt-3 opacity-90">Menús que respetan tus alergias, gustos y tiempo en la cocina.</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-hero px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 font-display text-2xl font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"><Leaf className="h-5 w-5" /></span>
            NutriPlanner
          </div>
          <h1 className="text-3xl font-semibold">{modo === "login" ? "Bienvenido de nuevo" : "Creá tu cuenta"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {modo === "login" ? "Ingresá para ver tus recetas y menús." : "En dos minutos configurás tu perfil alimentario."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-full bg-secondary p-1 text-sm font-medium">
            {(["login", "registro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => cambiarModo(m)}
                className={`rounded-full py-2 transition ${modo === m ? "bg-card shadow-card" : "text-muted-foreground"}`}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {modo === "registro" && (
              <Input
                label="Nombre de usuario"
                required
                minLength={3}
                maxLength={50}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            )}
            <Input
              label="Correo electrónico"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              required
              minLength={modo === "registro" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3.5 text-destructive transition-all"
              >
                <div className="flex items-start gap-3">
                  {error.esRed ? (
                    <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider">{error.titulo}</p>
                    <p className="text-sm leading-relaxed text-destructive/90">{error.mensaje}</p>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando ? "Cargando…" : modo === "login" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>
          {USE_MOCK && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Versión de demostración: cualquier correo y contraseña funcionan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
