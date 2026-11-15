import { NOMBRES_TOKENS } from './tokens-nombres';

export type NombreToken = (typeof NOMBRES_TOKENS)[number];
export type Paleta = Record<NombreToken, string>;
export type ModoTema = 'claro' | 'oscuro';

/**
 * Verdes, negro y blanco. Los neutros llevan una gota de verde (#F4F7F5 y no
 * #F5F5F5): un gris puro junto a un verde se ve sucio, uno teñido se ve de la
 * misma familia.
 *
 * El color SIGNIFICA algo, no decora:
 * - `primario`: la acción principal de cada pantalla.
 * - `tinta` + `menta`: la tarjeta protagonista (lo disponible, el ahorro).
 * - `seleccion`: la opción elegida (chips, categorías). Negro en claro,
 *   casi blanco en oscuro: siempre el máximo contraste con el fondo.
 * - `peligro`: único color fuera de la gama, sólo para "te pasaste".
 * - `cat-*`: una escala de verdes por categoría. Nunca va sola: siempre con
 *   su nombre al lado, porque seis verdes no se distinguen sólo por el tono.
 */
const CLARA: Paleta = {
  fondo: '#FFFFFF',
  superficie: '#F4F7F5',
  'superficie-alta': '#E8EFEA',
  borde: '#E1E8E3',
  texto: '#0A0F0C',
  'texto-suave': '#56665D',
  primario: '#15803D',
  'primario-texto': '#FFFFFF',
  acento: '#E2F5E8',
  'acento-texto': '#14532D',
  tinta: '#0A0F0C',
  'tinta-texto': '#FFFFFF',
  'tinta-suave': '#A3B3AA',
  'tinta-borde': '#223029',
  menta: '#4ADE80',
  // El verde del logo (assets/images/logo.png se tiñe con él).
  marca: '#034019',
  seleccion: '#0A0F0C',
  'seleccion-texto': '#FFFFFF',
  'seleccion-icono': '#4ADE80',
  peligro: '#DC2626',
  'peligro-suave': '#FDECEC',
  'cat-1': '#14532D',
  'cat-2': '#15803D',
  'cat-3': '#22C55E',
  'cat-4': '#4ADE80',
  'cat-5': '#86EFAC',
  'cat-6': '#0A0F0C',
  // Verde oliva y lima: siguen en la familia, pero se distinguen de los seis primeros.
  'cat-7': '#3F6212',
  'cat-8': '#A3E635',
};

const OSCURA: Paleta = {
  fondo: '#060907',
  superficie: '#0F1511',
  'superficie-alta': '#17201A',
  borde: '#1E2922',
  texto: '#EEF4F0',
  'texto-suave': '#91A399',
  primario: '#22C55E',
  'primario-texto': '#03140A',
  acento: '#0F2619',
  'acento-texto': '#86EFAC',
  tinta: '#0C1A12',
  'tinta-texto': '#FFFFFF',
  'tinta-suave': '#9FB7A9',
  'tinta-borde': '#1F382A',
  menta: '#4ADE80',
  // En oscuro el logo pasa a menta: el verde de la marca se pierde sobre negro.
  marca: '#4ADE80',
  // En oscuro la selección se INVIERTE: un negro sobre casi negro no se ve.
  seleccion: '#EEF4F0',
  'seleccion-texto': '#0A0F0C',
  'seleccion-icono': '#15803D',
  peligro: '#F87171',
  'peligro-suave': '#2A1414',
  'cat-1': '#BBF7D0',
  'cat-2': '#86EFAC',
  'cat-3': '#4ADE80',
  'cat-4': '#22C55E',
  'cat-5': '#15803D',
  'cat-6': '#E5ECE8',
  'cat-7': '#D9F99D',
  'cat-8': '#65A30D',
};

export const PALETAS: Record<ModoTema, Paleta> = { claro: CLARA, oscuro: OSCURA };

/** `#15803D` → `21 128 61`, el formato que espera `rgb(var(--x) / alpha)`. */
export function hexACanales(hex: string): string {
  const limpio = hex.replace('#', '');
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Variables CSS de una paleta, listas para `vars()` de NativeWind. */
export function variablesCss(paleta: Paleta): Record<`--${NombreToken}`, string> {
  return Object.fromEntries(
    NOMBRES_TOKENS.map((nombre) => [`--${nombre}`, hexACanales(paleta[nombre])]),
  ) as Record<`--${NombreToken}`, string>;
}

/**
 * Familias de Manrope por peso. En React Native el peso NO elige el archivo de
 * la fuente (en Android ni siquiera lo intenta), así que cada peso es su
 * propia familia.
 */
export const FUENTES = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export type PesoFuente = keyof typeof FUENTES;
