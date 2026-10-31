// Cliente HTTP hacia la API FastAPI de NutriPlanner.
// Configurar la URL en un archivo .env:  VITE_API_URL=http://localhost:8000
// Mientras USE_MOCK sea true, las funciones devuelven datos de ejemplo.

import * as mock from "@/data/mock";
import quinoa from "@/assets/receta-quinoa.jpg";
import avena from "@/assets/receta-avena.jpg";
import salmon from "@/assets/receta-salmon.jpg";
import sopa from "@/assets/receta-sopa.jpg";
import type {
  Cuenta,
  PerfilAlimentario,
  Receta,
  Alergia,
  CategoriaAlimento,
  Ingrediente,
} from "@/types";

export const IMAGENES_FALLBACK = [quinoa, avena, salmon, sopa];

/**
 * Asegura que una receta proveniente del backend tenga todos los campos requeridos
 * y una imagen válida asignada si el backend no proporciona una.
 */
export function normalizarReceta(
  r: Partial<Receta> & { id: number },
  index = 0
): Receta {
  const fallbackImg =
    IMAGENES_FALLBACK[Math.abs(r.id || index) % IMAGENES_FALLBACK.length] ?? quinoa;

  return {
    id: Number(r.id),
    nombre: r.nombre || "Receta sin nombre",
    pasos: r.pasos || "",
    tiempo_preparacion:
      typeof r.tiempo_preparacion === "number" ? r.tiempo_preparacion : 20,
    dificultad: r.dificultad || "PRINCIPIANTE",
    info_nutricional: r.info_nutricional ?? null,
    activa: r.activa ?? true,
    tipos_comida: Array.isArray(r.tipos_comida) ? r.tipos_comida : [],
    ingredientes: Array.isArray(r.ingredientes) ? r.ingredientes : [],
    imagen:
      r.imagen && r.imagen.trim().length > 0 ? r.imagen : fallbackImg,
  };
}


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

export interface ValidationErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

export interface ApiErrorOptions {
  status: number;
  message: string;
  code?: string | undefined;
  details?: unknown;
  rawMessage?: string | undefined;
}

export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;
  public rawMessage?: string | undefined;

  constructor(statusOrOptions: number | ApiErrorOptions, legacyMessage?: string) {
    if (typeof statusOrOptions === "number") {
      const msg = legacyMessage ?? `Error ${statusOrOptions}`;
      super(msg);
      this.status = statusOrOptions;
      this.code = `HTTP_${statusOrOptions}`;
      this.rawMessage = legacyMessage;
    } else {
      super(statusOrOptions.message);
      this.status = statusOrOptions.status;
      this.code =
        statusOrOptions.code ??
        (statusOrOptions.status === 0 ? "NETWORK_ERROR" : `HTTP_${statusOrOptions.status}`);
      this.details = statusOrOptions.details;
      this.rawMessage = statusOrOptions.rawMessage;
    }
    this.name = "ApiError";
  }

  get isNetworkError(): boolean {
    return this.status === 0 || this.code === "NETWORK_ERROR" || this.code === "TIMEOUT_ERROR";
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

const TRADUCCIONES_MENSAJES: Record<string, string> = {
  "incorrect username or password": "El correo o la contraseña son incorrectos.",
  "invalid credentials": "Credenciales incorrectas. Verificá tu correo y contraseña.",
  "not authenticated": "No has iniciado sesión o tu sesión ha expirado.",
  "could not validate credentials": "No se pudieron validar las credenciales de acceso.",
  "user already exists": "Ya existe un usuario registrado con este correo.",
  "username already exists": "El nombre de usuario ya se encuentra registrado.",
  "email already registered": "El correo electrónico ya se encuentra registrado.",
  "user not found": "No se encontró ningún usuario con esos datos.",
  "detail not found": "El recurso solicitado no fue encontrado.",
  "internal server error": "Ocurrió un error interno en el servidor.",
};

const TRADUCCIONES_VALIDACIONES: Record<string, string> = {
  "value is not a valid email address": "El correo electrónico no tiene un formato válido.",
  "field required": "Este campo es obligatorio.",
  "input should be a valid string": "El valor ingresado no es válido.",
  "input should be a valid integer": "El valor debe ser un número entero válido.",
};

function traducirMensajeBackend(mensaje: string): string {
  const normalizado = mensaje.trim().toLowerCase();
  if (TRADUCCIONES_MENSAJES[normalizado]) {
    return TRADUCCIONES_MENSAJES[normalizado];
  }

  const matchMin = normalizado.match(/at least (\d+) characters/i);
  if (matchMin) {
    return `Debe tener al menos ${matchMin[1]} caracteres.`;
  }

  const matchMax = normalizado.match(/at most (\d+) characters/i);
  if (matchMax) {
    return `Debe tener como máximo ${matchMax[1]} caracteres.`;
  }

  return mensaje;
}

function formatearErroresPydantic(items: ValidationErrorItem[]): string {
  const mensajes = items.map((item) => {
    const campo = item.loc
      ? item.loc.filter((part) => part !== "body" && part !== "query").join(".")
      : "";
    let texto = item.msg ?? "Dato inválido";
    const textoNormalizado = texto.trim().toLowerCase();
    if (TRADUCCIONES_VALIDACIONES[textoNormalizado]) {
      texto = TRADUCCIONES_VALIDACIONES[textoNormalizado];
    } else {
      texto = traducirMensajeBackend(texto);
    }
    return campo ? `${campo}: ${texto}` : texto;
  });

  return mensajes.join(" — ");
}

function procesarErrorRespuesta(
  response: Response,
  datos: unknown,
  path: string
): { message: string; code: string; details?: unknown; rawMessage?: string } {
  const status = response.status;
  let rawMessage = "";
  let message = "";
  let details: unknown = undefined;

  if (datos && typeof datos === "object") {
    details = datos;
    const body = datos as {
      detail?: unknown;
      message?: unknown;
      error?: unknown;
    };

    if (typeof body.detail === "string") {
      rawMessage = body.detail;
      message = traducirMensajeBackend(body.detail);
    } else if (Array.isArray(body.detail)) {
      const lista = body.detail as ValidationErrorItem[];
      rawMessage = JSON.stringify(lista);
      message = formatearErroresPydantic(lista);
    } else if (typeof body.message === "string") {
      rawMessage = body.message;
      message = traducirMensajeBackend(body.message);
    } else if (typeof body.error === "string") {
      rawMessage = body.error;
      message = traducirMensajeBackend(body.error);
    }
  } else if (typeof datos === "string" && datos.trim()) {
    rawMessage = datos;
    if (datos.startsWith("<")) {
      rawMessage = "Respuesta HTML del servidor";
    } else {
      message = traducirMensajeBackend(datos);
    }
  }

  if (!message) {
    if (path.startsWith("/auth/token") && (status === 400 || status === 401)) {
      message = "Correo o contraseña incorrectos. Por favor, verificá tus datos.";
    } else {
      switch (status) {
        case 400:
          message = "La solicitud no es válida. Verificá los datos enviados.";
          break;
        case 401:
          message = "No estás autenticado o tu sesión ha caducado. Por favor, ingresá nuevamente.";
          break;
        case 403:
          message = "No tenés los permisos requeridos para realizar esta acción.";
          break;
        case 404:
          message = "El recurso solicitado no fue encontrado.";
          break;
        case 409:
          message = "Ya existe un registro con esos datos o hubo un conflicto.";
          break;
        case 422:
          message = "Los datos ingresados no cumplen con el formato requerido.";
          break;
        case 500:
          message = "El servidor tuvo un problema interno al procesar la solicitud.";
          break;
        case 502:
        case 503:
        case 504:
          message = "El servidor de NutriPlanner está temporalmente fuera de servicio o no responde.";
          break;
        default:
          message = `Ocurrió un error inesperado (Código ${status}).`;
      }
    }
  }

  const code =
    status === 401
      ? "UNAUTHORIZED"
      : status === 403
      ? "FORBIDDEN"
      : status === 404
      ? "NOT_FOUND"
      : status === 409
      ? "CONFLICT"
      : status === 422
      ? "VALIDATION_ERROR"
      : status >= 500
      ? "SERVER_ERROR"
      : `HTTP_${status}`;

  return { message, code, details, rawMessage };
}

export function getErrorMessage(
  err: unknown,
  fallback = "No se pudo completar la operación. Por favor, intentá nuevamente."
): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      return "No se pudo conectar con el servidor. Comprobá que el servidor backend esté encendido.";
    }
    return err.message;
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  return fallback;
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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error(`[NutriPlanner API] Fallo de conexión hacia ${API_URL}${path}:`, error);

    const isAbort = error instanceof Error && error.name === "AbortError";
    const mensaje = isAbort
      ? "El servidor demoró demasiado en responder. Por favor, reintentá en unos momentos."
      : "No se pudo conectar con el servidor. Comprobá que el backend esté en ejecución y tengas conexión a internet.";

    throw new ApiError({
      status: 0,
      code: isAbort ? "TIMEOUT_ERROR" : "NETWORK_ERROR",
      message: mensaje,
      rawMessage: error instanceof Error ? error.message : String(error),
      details: error,
    });
  }

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
    let datosError: unknown = null;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        datosError = await response.json();
      } else {
        datosError = await response.text();
      }
    } catch {
      // Si falla la lectura del cuerpo, continuar con cuerpo nulo
    }

    const { message, code, details, rawMessage } = procesarErrorRespuesta(
      response,
      datosError,
      path
    );

    console.warn(`[NutriPlanner API] Error ${response.status} en ${path}:`, {
      message,
      code,
      details,
      rawMessage,
    });

    throw new ApiError({
      status: response.status,
      code,
      message,
      details,
      rawMessage,
    });
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

  // RECETAS: integración con endpoints FastAPI GET /recetas y GET /recetas/{id}
  getRecetas: async (): Promise<Receta[]> => {
    if (USE_MOCK) return delay(mock.recetas);
    const datos = await request<Receta[]>("/recetas");
    return Array.isArray(datos) ? datos.map((r, i) => normalizarReceta(r, i)) : [];
  },

  getReceta: async (id: number | string): Promise<Receta> => {
    if (USE_MOCK) {
      const encontrada = mock.recetas.find((x) => String(x.id) === String(id));
      if (!encontrada) {
        throw new ApiError({
          status: 404,
          message: "Receta no encontrada",
          code: "NOT_FOUND",
        });
      }
      return delay(encontrada);
    }
    const datos = await request<Receta>(`/recetas/${id}`);
    return normalizarReceta(datos);
  },
};