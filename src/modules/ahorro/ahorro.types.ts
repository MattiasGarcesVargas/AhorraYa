import type { MovimientoCuenta, TipoMovimientoCuenta } from '@/modules/cuentas/cuentas.types';

export type TipoMovimientoAhorro = TipoMovimientoCuenta;

/**
 * Un movimiento de una cuenta de AHORRO (flexible), visto desde la meta: sólo
 * lo que hace falta para saber cuánto se apartó y cuánto se sacó. Cualquier
 * `MovimientoCuenta` sirve; las cuentas en sí viven en el módulo `cuentas`.
 */
export type MovimientoAhorro = Pick<
  MovimientoCuenta,
  'id' | 'montoCentavos' | 'tipo' | 'nota' | 'fecha' | 'creadoEn'
> &
  // `origen`: de dónde salió un aporte (sin valor = del sueldo).
  // `contraparteId`: la otra cuenta, para reconocer pases entre cuentas de ahorro.
  Partial<Pick<MovimientoCuenta, 'origen' | 'contraparteId'>>;
