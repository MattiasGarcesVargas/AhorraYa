import type { Ionicons } from '@expo/vector-icons';

import type { Centavos } from '@/lib/dinero';

import type { NombreToken } from './tema.constants';

export type NombreIcono = keyof typeof Ionicons.glyphMap;

/**
 * Las categorías viven en la base de datos y se administran desde la app
 * (Ajustes → Categorías). Esta lista sólo SIEMBRA la base la primera vez:
 * son las de mi plan (mi_situacion_financiera.md).
 *
 * Los `id` de estas seis no se cambian nunca: los gastos guardados apuntan a
 * ellos.
 */
export const CATEGORIAS_INICIALES = [
  {
    id: 'transporte',
    nombre: 'Transporte',
    icono: 'bus-outline',
    color: 'cat-1',
    limiteMensualCentavos: 12_000,
  },
  {
    id: 'novia',
    nombre: 'Novia',
    icono: 'heart-outline',
    color: 'cat-2',
    limiteMensualCentavos: 7_000,
  },
  {
    id: 'comida',
    nombre: 'Comida',
    icono: 'fast-food-outline',
    color: 'cat-3',
    limiteMensualCentavos: 4_000,
  },
  {
    id: 'salidas',
    nombre: 'Salidas',
    icono: 'beer-outline',
    color: 'cat-4',
    limiteMensualCentavos: 4_000,
  },
  {
    id: 'compras',
    nombre: 'Compras',
    icono: 'bag-handle-outline',
    color: 'cat-5',
    limiteMensualCentavos: 2_500,
  },
  {
    id: 'imprevistos',
    nombre: 'Imprevistos',
    icono: 'flash-outline',
    color: 'cat-6',
    limiteMensualCentavos: 2_500,
  },
] as const satisfies readonly {
  id: string;
  nombre: string;
  icono: NombreIcono;
  color: NombreToken;
  limiteMensualCentavos: Centavos;
}[];

/**
 * Categorías de apps del exterior (Uber, Apple, Claude…): al pagarlas con
 * tarjeta el banco cobra además IVA e ISD (ver `impuestos-exterior.constants`).
 * Se siembran aparte de las de mi plan y sin límite: cada quien pone el suyo.
 */
export const CATEGORIAS_DEL_EXTERIOR = [
  { id: 'uber', nombre: 'Uber', icono: 'car-outline', color: 'cat-7' },
  { id: 'suscripciones', nombre: 'Suscripciones', icono: 'card-outline', color: 'cat-8' },
] as const satisfies readonly {
  id: string;
  nombre: string;
  icono: NombreIcono;
  color: NombreToken;
}[];

/**
 * Otras formas de llamar a las categorías iniciales, para el enlace del atajo
 * ("almuerzo" → Comida). Van por id, así que siguen valiendo aunque se
 * renombre la categoría.
 */
export const ALIAS_CATEGORIAS: Readonly<Record<string, readonly string[]>> = {
  transporte: ['bus', 'taxi', 'pasaje'],
  novia: ['pareja', 'mi novia', 'cita'],
  comida: ['almuerzo', 'comer', 'snack', 'cafe'],
  salidas: ['salida', 'fiesta', 'amigos', 'cine'],
  compras: ['compras personales', 'compra', 'ropa', 'cosas'],
  imprevistos: ['imprevisto', 'otros', 'otro', 'emergencia'],
  uber: ['uber rides', 'uber eats'],
  suscripciones: ['suscripcion', 'apple', 'icloud', 'claude'],
};

/** Tonos disponibles para una categoría: la escala de verdes y negro de la marca. */
export const COLORES_CATEGORIA = [
  'cat-1',
  'cat-2',
  'cat-3',
  'cat-4',
  'cat-5',
  'cat-6',
  'cat-7',
  'cat-8',
] as const satisfies readonly NombreToken[];

export type ColorCategoria = (typeof COLORES_CATEGORIA)[number];

/** Íconos que se ofrecen al crear una categoría: los gastos típicos del día a día. */
export const ICONOS_CATEGORIA = [
  'bus-outline',
  'car-outline',
  'bicycle-outline',
  'airplane-outline',
  'heart-outline',
  'people-outline',
  'fast-food-outline',
  'restaurant-outline',
  'cafe-outline',
  'pizza-outline',
  'beer-outline',
  'wine-outline',
  'bag-handle-outline',
  'cart-outline',
  'shirt-outline',
  'gift-outline',
  'game-controller-outline',
  'film-outline',
  'musical-notes-outline',
  'fitness-outline',
  'medkit-outline',
  'school-outline',
  'book-outline',
  'home-outline',
  'phone-portrait-outline',
  'wifi-outline',
  'paw-outline',
  'cut-outline',
  'sparkles-outline',
  'card-outline',
  'flash-outline',
  'pricetag-outline',
] as const satisfies readonly NombreIcono[];

export const LARGO_MAXIMO_NOMBRE_CATEGORIA = 24;
