import type { Ingreso } from '../ingresos.types';

/**
 * ¿Este ingreso es la devolución de un ISD? Es plata que vuelve a la cuenta,
 * no plata nueva: mueve el saldo pero no cuenta como ingreso del periodo.
 */
export function esDevolucionIsd(ingreso: Pick<Ingreso, 'tipo' | 'gastoId'>): boolean {
  return ingreso.tipo === 'reembolso' && ingreso.gastoId != null;
}
