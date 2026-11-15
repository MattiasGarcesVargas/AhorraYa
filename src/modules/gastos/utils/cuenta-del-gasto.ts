import type { MetodoPagoId } from '@/constants/metodos-pago.constants';
import type { Cuenta } from '@/modules/cuentas/cuentas.types';

/**
 * Formas de pago en las que hay que ELEGIR de qué cuenta del banco sale la
 * plata. El efectivo no se elige: sale de la billetera. El crédito sale
 * después (cuando se paga la tarjeta) y no baja ninguna cuenta al gastar.
 */
const METODOS_CON_CUENTA: readonly MetodoPagoId[] = ['debito', 'transferencia'];

export function tocaCuenta(metodo: MetodoPagoId): boolean {
  return METODOS_CON_CUENTA.includes(metodo);
}

type CuentaConTipo = Pick<Cuenta, 'id' | 'tipo' | 'orden'>;

/** La billetera (la primera cuenta de efectivo), si existe. */
export function billeteraDe(cuentas: readonly CuentaConTipo[] = []): number | null {
  const deEfectivo = cuentas.filter((cuenta) => cuenta.tipo === 'efectivo');
  return [...deEfectivo].sort((a, b) => a.orden - b.orden || a.id - b.id)[0]?.id ?? null;
}

/** Las cuentas del banco: las que se ofrecen al pagar con débito o transferencia. */
export function cuentasDeBanco<T extends Pick<Cuenta, 'tipo'>>(cuentas: readonly T[]): T[] {
  return cuentas.filter((cuenta) => cuenta.tipo !== 'efectivo');
}

/**
 * La cuenta que le corresponde a un gasto según cómo se pagó: la elegida con
 * débito o transferencia, la billetera en efectivo, ninguna con crédito.
 */
export function cuentaDelGasto(
  metodo: MetodoPagoId,
  cuentaId: number | null,
  billeteraId: number | null = null,
): number | null {
  if (tocaCuenta(metodo)) return cuentaId;
  return metodo === 'efectivo' ? billeteraId : null;
}
