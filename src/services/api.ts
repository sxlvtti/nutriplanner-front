// Cliente HTTP hacia la API FastAPI de NutriPlanner.
// Configurar la URL en un archivo .env:  VITE_API_URL=http://localhost:8000
// Mientras USE_MOCK sea true, las funciones devuelven datos de ejemplo.

import * as mock from "@/data/mock";
import type {
  Cuenta,
  PerfilAlimentario,
  Receta,
  Alergia,
  CategoriaAlimento,
  Ingrediente,
} from "@/types";


export const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:8000";
export const USE_MOCK = false;

let token: string | null = null;
export const setToken = (nuevoToken: string | null) => {
  token = nuevoToken;
};

let onUnauthorizedCallback: (() => void) | null = null;
let isHandlingUnauthorized = false;

export const setOnUnauthorized = (callback: (() => void) | null) => {
  onUnauthorizedCallback = callback;
};

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface PerfilAPI {
  id: number;
  cuenta_id: number;
  nivel_culinario: PerfilAlimentario["nivel_culinario"];
  alergias_ids: number[];
  ingredientes_evitados_ids: number[];
  categorias_evitadas_ids: number[];
}

function desdeAPI(datos: PerfilAPI): PerfilAlimentario {
  return {
    nivel_culinario: datos.nivel_culinario,
    alergias: datos.alergias_ids,
    ingredientes_evitados: datos.ingredientes_evitados_ids,
    categorias_evitadas: datos.categorias_evitadas_ids,
  };
}

function haciaAPI(perfil: PerfilAlimentario) {
  return {
    nivel_culinario: perfil.nivel_culinario,
    alergias_ids: perfil.alergias,
    ingredientes_evitados_ids: perfil.ingredientes_evitados,
    categorias_evitadas_ids: perfil.categorias_evitadas,
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof URLSearchParams)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Interceptor de respuesta JWT: si el token expiró o no es válido (401),
  // y no estamos en la ruta de login, limpiamos el token y derivamos al login.
  if (response.status === 401 && !path.startsWith("/auth/token")) {
    setToken(null);
    try {
      sessionStorage.removeItem("nutriplanner-token");
    } catch {
      // Ignorar si sessionStorage no está accesible
    }

    if (!isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      try {
        onUnauthorizedCallback?.();
      } finally {
        setTimeout(() => {
          isHandlingUnauthorized = false;
        }, 1000);
      }
    }
  }

  if (!response.ok) {
    let detalle = `Error ${response.status}`;

    try {
      const datos = await response.json();

      if (typeof datos.detail === "string") {
        detalle = datos.detail;
      }
    } catch {
      // Mantener mensaje HTTP si no hay JSON.
    }

    throw new ApiError(response.status, detalle);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const delay = <T,>(value: T) =>
  new Promise<T>((resolve) =>
    setTimeout(() => resolve(value), 250)
  );

export const api = {
  // AUTENTICACIÓN

  login: async (
    correo: string,
    password: string
  ): Promise<{ token: string; cuenta: Cuenta }> => {
    if (USE_MOCK) {
      return delay({
        token: "mock-token",
        cuenta: {
          id: 1,
          nombre_usuario: correo.split("@")[0] ?? correo,
          correo,
          rol: "USUARIO",
        },
      });
    }

    const formulario = new URLSearchParams();
    formulario.set("username", correo);
    formulario.set("password", password);

    const respuesta = await request<TokenResponse>(
      "/auth/token",
      {
        method: "POST",
        headers: {
          "content-Type": "application/x-www-form-urlencoded",
        },
        body: formulario,
      }
    );

    setToken(respuesta.access_token);

    try {
      const cuenta = await request<Cuenta>("/cuentas/me");

      return {
        token: respuesta.access_token,
        cuenta,
      };
    } catch (error) {
      setToken(null);
      throw error;
    }
  },

  registro: async (
    nombre_usuario: string,
    correo: string,
    password: string
  ): Promise<{ token: string; cuenta: Cuenta }> => {
    if (USE_MOCK) {
      return delay({
        token: "mock-token",
        cuenta: {
          id: 1,
          nombre_usuario,
          correo,
          rol: "USUARIO",
        },
      });
    }

    await request<Cuenta>("/cuentas", {
      method: "POST",
      body: JSON.stringify({
        nombre_usuario,
        correo,
        password,
      }),
    });

    // Mantener la experiencia actual:
    // después del registro se inicia sesión.
    return api.login(correo, password);
  },

  getCuenta: () =>
    USE_MOCK
      ? delay<Cuenta>({
          id: 1,
          nombre_usuario: "usuario",
          correo: "usuario@example.com",
          rol: "USUARIO",
        })
      : request<Cuenta>("/cuentas/me"),

  // PERFIL ALIMENTARIO

  getPerfil: async (): Promise<PerfilAlimentario | null> => {
    if (USE_MOCK) return null;

    try {
      const datos = await request<PerfilAPI>("/perfil/me");
      return desdeAPI(datos);
    } catch (error) {
      // 404 indica perfil inexistente; otros errores
      // deben propagarse y no confundirse con ese caso.
      if (error instanceof ApiError && error.status === 404) {
          return null;
      }

      throw error;
    }
  },

  guardarPerfil: async (
    perfil: PerfilAlimentario
  ): Promise<PerfilAlimentario> => {
    if (USE_MOCK) return delay(perfil);

    const datos = haciaAPI(perfil);

    // Determinar si el perfil debe crearse o actualizarse.
    const existente = await api.getPerfil();

    const respuesta = await request<PerfilAPI>(
      existente ? "/perfil/me" : "/perfil",
      {
        method: existente ? "PUT" : "POST",
        body: JSON.stringify(datos),
      }
    );

    return desdeAPI(respuesta);
  },

  // CATÁLOGOS

  getAlergias: () =>
    USE_MOCK
      ? delay(mock.alergias)
      : request<Alergia[]>("/alergias"),

  getCategorias: () =>
    USE_MOCK
      ? delay(mock.categorias)
      : request<CategoriaAlimento[]>("/categorias-alimento"),

  getIngredientes: () =>
    USE_MOCK
      ? delay(mock.ingredientes)
      : request<Ingrediente[]>("/ingredientes"),

  // RECETAS: por ahora continúa con datos simulados.
  getRecetas: () =>
    USE_MOCK
      ? delay(mock.recetas)
      : request<Receta[]>("/recetas"),
};