import type { MetodoPagoId } from '@/constants/metodos-pago.constants';

/**
 * Formas de pago que sacan plata de una cuenta del banco en el momento. El
 * efectivo ya salió antes (cuando se retiró) y el crédito sale después (cuando
 * se paga la tarjeta): ninguno de los dos baja el saldo de una cuenta al gastar.
 */
const METODOS_CON_CUENTA: readonly MetodoPagoId[] = ['debito', 'transferencia'];

export function tocaCuenta(metodo: MetodoPagoId): boolean {
  return METODOS_CON_CUENTA.includes(metodo);
}

/** La cuenta que le corresponde a un gasto según cómo se pagó. */
export function cuentaDelGasto(metodo: MetodoPagoId, cuentaId: number | null): number | null {
  return tocaCuenta(metodo) ? cuentaId : null;
}
