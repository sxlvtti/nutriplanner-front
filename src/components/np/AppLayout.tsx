// Estructura común de las pantallas internas: barra de navegación + contenido.
// Si no hay sesión, redirige al inicio de sesión.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Leaf, LogOut, Menu as MenuIcon, X } from "lucide-react";
import { useApp } from "@/lib/app-state";

const links = [
  { to: "/recetas", label: "Recetas" },
  { to: "/generador", label: "Generar menú" },
  { to: "/menus", label: "Mis menús" },
  { to: "/perfil", label: "Perfil" },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { cuenta, cerrarSesion, cargandoSesion } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!cargandoSesion && !cuenta) {
      navigate({ to: "/" });
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

  if (!cuenta) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/recetas" className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            NutriPlanner
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-primary-soft text-primary" }}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={cerrarSesion}
              className="ml-2 rounded-full p-2 text-muted-foreground hover:bg-secondary"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menú">
            {open ? <X /> : <MenuIcon />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t px-4 py-3 md:hidden">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium"
                activeProps={{ className: "bg-primary-soft text-primary" }}
              >
                {l.label}
              </Link>
            ))}
            <button onClick={cerrarSesion} className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground">
              Cerrar sesión
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
