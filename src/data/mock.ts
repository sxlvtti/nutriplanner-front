// Datos de ejemplo. Se reemplazarán por respuestas de la API FastAPI.
import { obtenerImagenReceta } from "@/lib/imagenes-recetas";
import sinImagen from "@/assets/recetas/sin-imagen.svg";
import type { Alergia, CategoriaAlimento, Ingrediente, Receta, Menu } from "@/types";

export const alergias: Alergia[] = [
  { id: 1, nombre: "Gluten" },
  { id: 2, nombre: "Lactosa" },
  { id: 3, nombre: "Frutos secos" },
  { id: 4, nombre: "Mariscos" },
  { id: 5, nombre: "Huevo" },
  { id: 6, nombre: "Pescado" },
];

export const categorias: CategoriaAlimento[] = [
  { id: 1, nombre: "Carnes rojas" },
  { id: 2, nombre: "Pescados" },
  { id: 3, nombre: "Lácteos" },
  { id: 4, nombre: "Cereales" },
  { id: 5, nombre: "Verduras" },
  { id: 6, nombre: "Frutas" },
  { id: 7, nombre: "Legumbres" },
];

export const ingredientes: Ingrediente[] = [
  { id: 1, nombre: "Quinoa", categoria_id: 4 },
  { id: 2, nombre: "Palta", categoria_id: 6 },
  { id: 3, nombre: "Tomate cherry", categoria_id: 5 },
  { id: 4, nombre: "Garbanzos", categoria_id: 7 },
  { id: 5, nombre: "Queso feta", categoria_id: 3 },
  { id: 6, nombre: "Avena", categoria_id: 4 },
  { id: 7, nombre: "Banana", categoria_id: 6 },
  { id: 8, nombre: "Leche", categoria_id: 3 },
  { id: 9, nombre: "Bebida de almendras", categoria_id: 3 },
  { id: 10, nombre: "Salmón", categoria_id: 2 },
  { id: 11, nombre: "Zucchini", categoria_id: 5 },
  { id: 12, nombre: "Espárragos", categoria_id: 5 },
  { id: 13, nombre: "Espinaca", categoria_id: 5 },
  { id: 14, nombre: "Crema", categoria_id: 3 },
  { id: 15, nombre: "Leche de coco", categoria_id: 6 },
  { id: 16, nombre: "Tofu firme", categoria_id: 7 },
  { id: 17, nombre: "Arándanos", categoria_id: 6 },
  { id: 18, nombre: "Lentejas", categoria_id: 7 },
];

export const recetas: Receta[] = [
  {
    id: 1, nombre: "Bowl de quinoa y garbanzos", tiempo_preparacion: 25, dificultad: "PRINCIPIANTE",
    info_nutricional: "520 kcal · 18 g proteína · 14 g fibra", activa: true,
    tipos_comida: ["ALMUERZO", "CENA"], imagen: sinImagen,
    pasos: "Cocinar la quinoa 15 minutos.\nEnjuagar los garbanzos.\nCortar tomates y palta.\nMezclar todo y condimentar con limón y oliva.",
    ingredientes: [
      { ingrediente_id: 1, cantidad: "1 taza" }, { ingrediente_id: 4, cantidad: "200 g" },
      { ingrediente_id: 3, cantidad: "10 u" }, { ingrediente_id: 2, cantidad: "1 u" },
      { ingrediente_id: 5, cantidad: "50 g", sustituto_id: 16 },
    ],
  },
  {
    id: 2, nombre: "Avena cremosa con frutos rojos", tiempo_preparacion: 10, dificultad: "PRINCIPIANTE",
    info_nutricional: "380 kcal · 11 g proteína · 8 g fibra", activa: true,
    tipos_comida: ["DESAYUNO", "MERIENDA"], imagen: sinImagen,
    pasos: "Calentar la leche.\nAgregar la avena y cocinar 5 minutos.\nServir con banana y arándanos.",
    ingredientes: [
      { ingrediente_id: 6, cantidad: "1/2 taza" }, { ingrediente_id: 8, cantidad: "250 ml", sustituto_id: 9 },
      { ingrediente_id: 7, cantidad: "1 u" }, { ingrediente_id: 17, cantidad: "1 puñado" },
    ],
  },
  {
    id: 3, nombre: "Salmón grillado con vegetales", tiempo_preparacion: 35, dificultad: "INTERMEDIO",
    info_nutricional: "610 kcal · 38 g proteína · 6 g fibra", activa: true,
    tipos_comida: ["ALMUERZO", "CENA"], imagen: sinImagen,
    pasos: "Precalentar la plancha.\nSalpimentar el salmón.\nGrillar 4 minutos por lado.\nSaltear zucchini y espárragos.\nServir con limón.",
    ingredientes: [
      { ingrediente_id: 10, cantidad: "200 g", sustituto_id: 16 }, { ingrediente_id: 11, cantidad: "1 u" },
      { ingrediente_id: 12, cantidad: "1 atado" }, { ingrediente_id: 3, cantidad: "8 u" },
    ],
  },
  {
    id: 4, nombre: "Crema de espinaca", tiempo_preparacion: 30, dificultad: "PRINCIPIANTE",
    info_nutricional: "290 kcal · 9 g proteína · 7 g fibra", activa: true,
    tipos_comida: ["CENA", "ALMUERZO"], imagen: sinImagen,
    pasos: "Rehogar cebolla.\nAgregar espinaca y caldo.\nCocinar 15 minutos.\nProcesar y sumar la crema.",
    ingredientes: [
      { ingrediente_id: 13, cantidad: "400 g" }, { ingrediente_id: 14, cantidad: "100 ml", sustituto_id: 15 },
    ],
  },
  {
    id: 5, nombre: "Ensalada tibia de lentejas", tiempo_preparacion: 40, dificultad: "INTERMEDIO",
    info_nutricional: "450 kcal · 22 g proteína · 16 g fibra", activa: true,
    tipos_comida: ["ALMUERZO"], imagen: sinImagen,
    pasos: "Cocinar lentejas 25 minutos.\nSaltear vegetales.\nMezclar y sumar queso feta.",
    ingredientes: [
      { ingrediente_id: 18, cantidad: "1 taza" }, { ingrediente_id: 3, cantidad: "10 u" },
      { ingrediente_id: 5, cantidad: "40 g", sustituto_id: 16 },
    ],
  },
  {
    id: 6, nombre: "Porridge de banana y coco", tiempo_preparacion: 15, dificultad: "PRINCIPIANTE",
    info_nutricional: "410 kcal · 9 g proteína · 7 g fibra", activa: true,
    tipos_comida: ["DESAYUNO"], imagen: sinImagen,
    pasos: "Cocinar la avena con leche de coco.\nPisar la banana e incorporar.\nServir tibio.",
    ingredientes: [
      { ingrediente_id: 6, cantidad: "1/2 taza" }, { ingrediente_id: 15, cantidad: "200 ml" },
      { ingrediente_id: 7, cantidad: "1 u" },
    ],
  },
  {
    id: 7, nombre: "Salmón en costra de hierbas", tiempo_preparacion: 50, dificultad: "AVANZADO",
    info_nutricional: "640 kcal · 40 g proteína · 4 g fibra", activa: true,
    tipos_comida: ["CENA"], imagen: sinImagen,
    pasos: "Preparar costra de hierbas.\nCubrir el salmón.\nHornear 18 minutos a 200 °C.\nAcompañar con espárragos.",
    ingredientes: [
      { ingrediente_id: 10, cantidad: "250 g" }, { ingrediente_id: 12, cantidad: "1 atado" },
    ],
  },
  {
    id: 8, nombre: "Sopa verde de zucchini", tiempo_preparacion: 25, dificultad: "PRINCIPIANTE",
    info_nutricional: "240 kcal · 7 g proteína · 6 g fibra", activa: true,
    tipos_comida: ["CENA", "MERIENDA"], imagen: sinImagen,
    pasos: "Cortar zucchini y espinaca.\nHervir 15 minutos.\nProcesar y servir.",
    ingredientes: [{ ingrediente_id: 11, cantidad: "2 u" }, { ingrediente_id: 13, cantidad: "200 g" }],
  },
];

/** Qué alergia afecta a cada ingrediente (tabla alergia_ingrediente). */
export const alergiaIngrediente: Record<number, number[]> = {
  2: [8, 5, 14], // Lactosa
  3: [9], // Frutos secos
  6: [10], // Pescado
  1: [6], // Gluten (avena común)
};

export const menusIniciales: Menu[] = [
  {
    id: 1, nombre: "Semana liviana", creado: "2026-10-12T10:00:00Z",
    dias: [
      { dia: "Lunes", comidas: { DESAYUNO: 2, ALMUERZO: 1, CENA: 4 } },
      { dia: "Martes", comidas: { DESAYUNO: 6, ALMUERZO: 5, CENA: 8 } },
      { dia: "Miércoles", comidas: { DESAYUNO: 2, ALMUERZO: 3, CENA: 4 } },
    ],
  },
];
