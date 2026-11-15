import { NOMBRES_TOKENS } from './tokens-nombres';

export type NombreToken = (typeof NOMBRES_TOKENS)[number];
export type Paleta = Record<NombreToken, string>;
export type ModoTema = 'claro' | 'oscuro';

/**
 * Papel y tinta verde: la app se lee como una libreta de cuentas, no como un
 * panel de control. Fondo de papel cálido (nunca blanco puro ni negro puro),
 * un solo verde profundo —el del logo— y tonos de tierra para lo demás.
 *
 * El color SIGNIFICA algo, no decora:
 * - `primario`: LA acción principal de cada pantalla. Una sola por pantalla;
 *   todo lo demás va en contorno o en texto.
 * - `tinta` + `menta`: la tarjeta protagonista (lo disponible, el total).
 * - `seleccion`: la opción elegida (chips, categorías): máximo contraste.
 * - `acento`: avisos tranquilos y llamados secundarios.
 * - `peligro`: terracota, sólo para "te pasaste" y para eliminar.
 * - `cat-*`: tonos de tierra distintos entre sí (verde, ocre, terracota,
 *   petróleo, ciruela…), apagados para no competir con `primario`. Siempre
 *   van con su nombre al lado.
 */
const CLARA: Paleta = {
  fondo: '#FAF8F3',
  superficie: '#F1EEE6',
  'superficie-alta': '#E6E2D7',
  borde: '#DCD7CA',
  texto: '#1A1F1B',
  'texto-suave': '#676B62',
  primario: '#0B4F2F',
  'primario-texto': '#FAF8F3',
  acento: '#E2EADB',
  'acento-texto': '#0B4F2F',
  tinta: '#12251B',
  'tinta-texto': '#F6F3EA',
  'tinta-suave': '#A9B8AC',
  'tinta-borde': '#28402F',
  menta: '#BBD9A3',
  // El verde del logo (assets/images/logo.png se tiñe con él).
  marca: '#034019',
  seleccion: '#1A1F1B',
  'seleccion-texto': '#FAF8F3',
  'seleccion-icono': '#BBD9A3',
  peligro: '#A93B26',
  'peligro-suave': '#F5E2DB',
  'cat-1': '#2F6B4A',
  'cat-2': '#A9762A',
  'cat-3': '#A9513A',
  'cat-4': '#2F6170',
  'cat-5': '#7A4B66',
  'cat-6': '#3B403C',
  'cat-7': '#657030',
  'cat-8': '#8A7458',
};

const OSCURA: Paleta = {
  fondo: '#111411',
  superficie: '#191D19',
  'superficie-alta': '#232823',
  borde: '#2D332D',
  texto: '#ECE9E0',
  'texto-suave': '#9A9E94',
  // En oscuro el verde se aclara y se apaga: un verde neón sobre negro grita.
  primario: '#A3CE8C',
  'primario-texto': '#10200F',
  acento: '#1B2A20',
  'acento-texto': '#B7DBA4',
  tinta: '#16261C',
  'tinta-texto': '#F3F0E7',
  'tinta-suave': '#9DAE9F',
  'tinta-borde': '#2A3D30',
  menta: '#B7DBA4',
  // En oscuro el logo pasa al verde claro: el de la marca se pierde sobre negro.
  marca: '#B7DBA4',
  // En oscuro la selección se INVIERTE: un negro sobre casi negro no se ve.
  seleccion: '#ECE9E0',
  'seleccion-texto': '#151815',
  'seleccion-icono': '#2F6B4A',
  peligro: '#E38B73',
  'peligro-suave': '#2E1B16',
  'cat-1': '#7FB894',
  'cat-2': '#D9B26A',
  'cat-3': '#D98E76',
  'cat-4': '#7FB0BF',
  'cat-5': '#B88AA6',
  'cat-6': '#C9CCC4',
  'cat-7': '#AEB86A',
  'cat-8': '#C2AE92',
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
