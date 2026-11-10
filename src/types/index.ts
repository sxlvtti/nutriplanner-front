// Tipos que reflejan los modelos de la API FastAPI (app/models y app/core/enums).

export type NivelDificultad = "PRINCIPIANTE" | "INTERMEDIO" | "AVANZADO";
export type TipoComida = "DESAYUNO" | "ALMUERZO" | "MERIENDA" | "CENA";
export type Rol = "USUARIO" | "MODERADOR";

export interface Cuenta {
  id: number;
  nombre_usuario: string;
  correo: string;
  rol: Rol;
  correo_verificado?: boolean;
}

export interface Alergia {
  id: number;
  nombre: string;
}

export interface CategoriaAlimento {
  id: number;
  nombre: string;
}

export interface Ingrediente {
  id: number;
  nombre: string;
  categoria_id: number;
}

export interface RecetaIngrediente {
  ingrediente_id: number;
  cantidad: string;
  unidad?: string;
  /** Ingrediente alternativo explícito (sustitución). */
  sustituto_id?: number;
}

export interface Receta {
  id: number;
  nombre: string;
  pasos: string;
  tiempo_preparacion: number; // minutos
  dificultad: NivelDificultad;
  info_nutricional: string | null;
  activa: boolean;
  tipos_comida: TipoComida[];
  ingredientes: RecetaIngrediente[];
  imagen?: string; // si la API no la provee, el frontend asigna una imagen de respaldo
}

export interface PerfilAlimentario {
  nivel_culinario: NivelDificultad;
  alergias: number[];
  ingredientes_evitados: number[];
  categorias_evitadas: number[];
}

export interface SustitucionSeleccionada {
  ingrediente_original_id: number;
  ingrediente_alternativo_id: number;
}


export interface InstantaneaComida {
  nombre_receta: string;
  pasos: string;
  ingredientes: {
    nombre: string;
    cantidad: string;
    unidad: string;
    sustitucion: {
      alternativa_id: number;
      ingrediente_original_id: number;
      nombre_original: string;
    } | null;
  }[];
}



export interface DiaMenu {
  dia: string;
  comidas: Partial<Record<TipoComida, number>>;

  sustituciones?: Partial<
    Record<TipoComida, SustitucionSeleccionada[]>
  >;

  instantaneas?: Partial<
    Record<TipoComida, InstantaneaComida>
  >;
}


export interface Menu {
  id: number;
  nombre: string;
  creado: string;
  dias: DiaMenu[];
}

export type EstadoCompatibilidad =
  | "COMPATIBLE"
  | "ADAPTABLE"
  | "INCOMPATIBLE";

export interface AlternativaDisponible {
  id: number;
  ingrediente_id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface IngredienteRestringido {
  receta_ingrediente_id: number;
  ingrediente_id: number;
  nombre: string;
  alternativas_validas: AlternativaDisponible[];
}

export interface CompatibilidadReceta {
  receta_id: number;
  nombre: string;
  estado_compatibilidad: EstadoCompatibilidad;
  ingredientes_restringidos: IngredienteRestringido[];
}
