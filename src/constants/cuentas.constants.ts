import type { BancoId } from './bancos.constants';

/**
 * Cuentas con las que arranca la app: las dos que tengo en el Pichincha. Sólo
 * SIEMBRAN la base (migración 3 y "Borrar todos los datos"); después se
 * crean, editan y eliminan desde la pestaña Cuentas.
 *
 * `tasaBp` es la tasa anual en puntos básicos: 500 = 5,00 %.
 */
export const CUENTAS_INICIALES = [
  { banco: 'pichincha', nombre: 'Cuenta de ahorros', tipo: 'diaria', tasaBp: 0 },
  { banco: 'pichincha', nombre: 'Cuenta flexible', tipo: 'flexible', tasaBp: 500 },
] as const satisfies readonly {
  banco: BancoId;
  nombre: string;
  tipo: 'diaria' | 'flexible';
  tasaBp: number;
}[];

export const LARGO_MAXIMO_NOMBRE_CUENTA = 30;

/** Tope de la tasa anual: 30,00 %. Por encima es un error de tecleo. */
export const TASA_MAXIMA_BP = 3_000;
