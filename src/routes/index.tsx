import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Leaf, AlertCircle, WifiOff, MailCheck } from "lucide-react";
import { toast } from "sonner";
import hero from "@/assets/recetas/ensalada-de-garbanzos.webp";
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
  const [correoPendiente, setCorreoPendiente] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);  
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
      if (modo === "login") {
        // INICIO DE SESIÓN
        const res = await api.login(
          correo.trim(),
          password
        );

        await iniciarSesion(res.cuenta, res.token);

        toast.success("¡Sesión iniciada con éxito!", {
          id: "auth-toast",
        });

        await navigate({
          to: "/recetas",
        });

      } else {
        // REGISTRO DE UNA CUENTA NUEVA
        const res = await api.registro(
          nombre.trim(),
          correo.trim(),
          password
        );

        if (res.requiereVerificacion) {
          // La cuenta requiere confirmar el correo.
          // No iniciamos sesión.
          setCorreoPendiente(res.cuenta.correo);
          setPassword("");

          toast.success(
            "Cuenta creada. Revisá tu correo electrónico.",
            { id: "auth-toast" }
          );

          return;
        }

        // La verificación no está habilitada.
        // Conservamos el inicio de sesión automático.
        await iniciarSesion(res.cuenta, res.token);

        toast.success("¡Cuenta creada con éxito!", {
          id: "auth-toast",
        });

        await navigate({
          to: "/onboarding",
        });
      }

    } catch (err) {
      // MANEJO DE ERRORES
      if (err instanceof ApiError) {
        let titulo =
          modo === "login"
            ? "No se pudo iniciar sesión"
            : "No se pudo crear la cuenta";

        if (err.isNetworkError) {
          titulo = "Servidor no disponible";

        } else if (
          modo === "login" &&
          err.status === 403 &&
          err.message.toLowerCase().includes("verific")
        ) {
          // La cuenta existe, pero el correo no está verificado.
          setCorreoPendiente(correo.trim());
          titulo = "Correo pendiente de verificación";

        } else if (err.status === 401 || err.status === 400) {
          titulo =
            modo === "login"
              ? "Credenciales incorrectas"
              : "Error en el registro";

        } else if (err.isValidationError) {
          titulo = "Datos inválidos o incompletos";

        } else if (err.isConflict) {
          titulo = "Cuenta existente";

        } else if (err.isServerError) {
          titulo = "Error en el servidor";
        }

        if (titulo === "Correo pendiente de verificación") {
          setError(null);
        } else {
          setError({
            titulo,
            mensaje: err.message,
            esRed: err.isNetworkError,
          });

          toast.error(err.message, {
            id: "auth-toast",
          });
        }

      } else {
        // Error no identificado como respuesta de la API.
        const mensaje = getErrorMessage(
          err,
          "No se pudo completar la operación. Por favor, intentá nuevamente."
        );

        setError({
          titulo: "Ocurrió un error inesperado",
          mensaje,
          esRed: false,
        });

        toast.error(mensaje, {
          id: "auth-toast",
        });
      }

    } finally {
      // Se ejecuta tanto si la operación funciona
      // como si ocurre un error.
      setCargando(false);
    }
  };

  const reenviarCorreo = async () => {
    if (!correoPendiente || reenviando) return;

    setReenviando(true);
    setError(null);

    try {
      const respuesta = await api.reenviarVerificacion(
        correoPendiente
      );

      toast.success(respuesta.mensaje, {
        id: "reenviar-toast",
      });

    } catch (err) {
      const mensaje = getErrorMessage(
        err,
        "No se pudo reenviar el correo de verificación."
      );

      setError({
        titulo: "No se pudo reenviar el correo",
        mensaje,
        esRed: err instanceof ApiError && err.isNetworkError,
      });

      toast.error(mensaje, {
        id: "reenviar-toast",
      });

    } finally {
      setReenviando(false);
    }
  };

  if (correoPendiente) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-2xl font-semibold">
            ¡Revisá tu correo electrónico!
          </h1>

          <p className="mt-4 text-sm text-muted-foreground">
            Tu cuenta de NutriPlanner está pendiente de verificación.
            Para activarla, abrí el enlace enviado a:
          </p>

          <p className="mt-3 break-all font-semibold">
            {correoPendiente}
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            No podrás iniciar sesión hasta confirmar tu correo.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 text-sm text-destructive"
            >
              {error.mensaje}
            </p>
          )}

          <div className="mt-8 space-y-3">
            <Button
              type="button"
              className="w-full"
              onClick={reenviarCorreo}
              disabled={reenviando}
            >
              {reenviando
                ? "Enviando..."
                : "Reenviar correo de verificación"}
            </Button>

            <button
              type="button"
              className="w-full py-2 text-sm font-medium text-primary hover:underline"
              onClick={() => {
                setCorreoPendiente(null);
                setModo("login");
                setError(null);
              }}
            >
              Volver a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

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
