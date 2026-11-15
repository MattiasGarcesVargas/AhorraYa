import type { MetodoPagoId } from '@/constants/metodos-pago.constants';

/**
 * Lo que cobra el banco, aparte del consumo, al pagar con tarjeta ecuatoriana
 * una app del exterior (Uber, Apple, Claude…). En puntos básicos: 1500 = 15 %.
 *
 * - IVA a servicios digitales: costo real, no vuelve.
 * - ISD (salida de divisas): el banco lo devuelve días después.
 */
export const IVA_EXTERIOR_BP = 1500;
export const ISD_BP = 500;

/** Sólo la tarjeta paga estos impuestos. Efectivo y transferencia, nunca. */
export const METODOS_CON_IMPUESTOS: readonly MetodoPagoId[] = ['debito', 'credito'];

/** Días que pasan entre el consumo y la devolución del ISD en la app. */
export const DIAS_PARA_DEVOLUCION_ISD = 1;
