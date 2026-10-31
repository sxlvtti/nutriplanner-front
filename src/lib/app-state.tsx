import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { menusIniciales } from "@/data/mock";
import { api, setToken, setOnUnauthorized, ApiError, USE_MOCK } from "@/services/api";
import type { Cuenta, Menu, PerfilAlimentario } from "@/types";

interface AppState {
  cuenta: Cuenta | null;
  perfil: PerfilAlimentario;
  menus: Menu[];
  favoritas: number[];
  excluidas: number[];
  cargandoSesion: boolean;
  iniciarSesion: (cuenta: Cuenta, token: string) => Promise<void>;
  cerrarSesion: () => void;
  setPerfil: (p: PerfilAlimentario) => Promise<void>;
  guardarMenu: (m: Omit<Menu, "id" | "creado">) => void;
  borrarMenu: (id: number) => void;
  alternarFavorita: (id: number) => void;
  alternarExcluida: (id: number) => void;
}

const Ctx = createContext<AppState | null>(null);

export const perfilVacio: PerfilAlimentario = {
  nivel_culinario: "PRINCIPIANTE",
  alergias: [],
  ingredientes_evitados: [],
  categorias_evitadas: [],
};

const leer = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [perfil, setPerfilState] = useState<PerfilAlimentario>(perfilVacio);
  const [menus, setMenus] = useState<Menu[]>(menusIniciales);
  const [favoritas, setFavoritas] = useState<number[]>([]);
  const [excluidas, setExcluidas] = useState<number[]>([]);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // INICIAR SESIÓN
  const iniciarSesion = async (
    nuevaCuenta: Cuenta,
    nuevoToken: string
  ): Promise<void> => {
    setToken(nuevoToken);
    sessionStorage.setItem("nutriplanner-token", nuevoToken);
    setCuenta(nuevaCuenta);
    setPerfilState(perfilVacio);

    if (USE_MOCK) return;

    try {
      const perfilGuardado = await api.getPerfil();
      setPerfilState(perfilGuardado ?? perfilVacio);
    } catch (err) {
      console.error("No se pudo recuperar el perfil:", err);
    }
  };

  // CERRAR SESIÓN
  const cerrarSesion = useCallback(() => {
    setToken(null);
    try {
      sessionStorage.removeItem("nutriplanner-token");
    } catch {
      // Ignorar si sessionStorage no está accesible
    }
    setCuenta(null);
    setPerfilState(perfilVacio);
    setMenus([]);
    setFavoritas([]);
    setExcluidas([]);
    void navigate({ to: "/" });
  }, [navigate]);

  // SUSCRIPCIÓN AL INTERCEPTOR DE TOKEN EXPIRADO / 401
  useEffect(() => {
    setOnUnauthorized(() => {
      cerrarSesion();
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [cerrarSesion]);

  // CARGAR DATOS SIMULADOS
  useEffect(() => {
    if (!USE_MOCK) return;

    setPerfilState(leer("nutriplanner-perfil", perfilVacio));
    setMenus(leer("nutriplanner-menus", menusIniciales));
    setFavoritas(leer("nutriplanner-favoritas", []));
    setExcluidas(leer("nutriplanner-excluidas", []));
  }, []);

  // GUARDAR PERFIL
  const setPerfil = async (p: PerfilAlimentario): Promise<void> => {
    if (USE_MOCK) {
      setPerfilState(p);
      localStorage.setItem("nutriplanner-perfil", JSON.stringify(p));
      return;
    }

    const perfilGuardado = await api.guardarPerfil(p);
    setPerfilState(perfilGuardado);
  };

  // MENÚS
  const guardarMenu = (m: Omit<Menu, "id" | "creado">) =>
    setMenus(prev => {
      const next = [
        { ...m, id: Date.now(), creado: new Date().toISOString() },
        ...prev,
      ];
      localStorage.setItem("nutriplanner-menus", JSON.stringify(next));
      return next;
    });

  const borrarMenu = (id: number) =>
    setMenus(prev => {
      const next = prev.filter(m => m.id !== id);
      localStorage.setItem("nutriplanner-menus", JSON.stringify(next));
      return next;
    });

  // FAVORITOS Y EXCLUSIONES
  const alternar = (
    key: "nutriplanner-favoritas" | "nutriplanner-excluidas",
    setter: (fn: (p: number[]) => number[]) => void,
    id: number
  ) =>
    setter(prev => {
      const next = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id];

      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });

  // RESTAURAR SESIÓN AL RECARGAR
  useEffect(() => {
    let activo = true;

    const restaurarSesion = async () => {
      const tokenGuardado = sessionStorage.getItem("nutriplanner-token");

      if (!tokenGuardado || USE_MOCK) {
        if (activo) setCargandoSesion(false);
        return;
      }

      setToken(tokenGuardado);

      try {
        const cuentaActual = await api.getCuenta();

        if (activo) {
          setCuenta(cuentaActual);
        }

        try {
          const perfilGuardado = await api.getPerfil();

          if (activo) {
            setPerfilState(perfilGuardado ?? perfilVacio);
          }
        } catch (err) {
          console.error("No se pudo recuperar el perfil:", err);
        }

      } catch (err) {
        console.error("No se pudo recuperar la sesión:", err);

        if (activo) {
          if (err instanceof ApiError && err.isNetworkError) {
            toast.error(
              "No se pudo conectar con el servidor para sincronizar tu sesión.",
              { id: "session-network-error" }
            );
          } else {
            setToken(null);
            try {
              sessionStorage.removeItem("nutriplanner-token");
            } catch {
              // Ignorar
            }
          }
          setCuenta(null);
          setPerfilState(perfilVacio);
        }
      } finally {
        if (activo) {
          setCargandoSesion(false);
        }
      }
    };

    void restaurarSesion();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        cuenta,
        perfil,
        menus,
        favoritas,
        excluidas,
        cargandoSesion,
        iniciarSesion,
        cerrarSesion,
        setPerfil,
        guardarMenu,
        borrarMenu,
        alternarFavorita: (id) =>
          alternar("nutriplanner-favoritas", setFavoritas, id),
        alternarExcluida: (id) =>
          alternar("nutriplanner-excluidas", setExcluidas, id),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error("useApp debe usarse dentro de <AppProvider>");
  }

  return ctx;
}
