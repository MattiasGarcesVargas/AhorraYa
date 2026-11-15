import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';

import type { Cuenta, NuevoMovimientoCuenta, OrigenAporte } from '../cuentas.types';

export interface DatosTransferencia {
  desdeId: number;
  haciaId: number;
  montoCentavos: Centavos;
  nota: string | null;
  fecha: FechaIso;
  /** Sólo se guarda si la plata entra a una cuenta de ahorro. */
  origen?: OrigenAporte;
}

/**
 * Por qué una transferencia no se puede hacer, o `null` si está bien. `saldoDesde`
 * es lo que hay en la cuenta de origen: no puede quedar en negativo.
 */
export function validarTransferencia(
  {
    desdeId,
    haciaId,
    montoCentavos,
  }: Pick<DatosTransferencia, 'desdeId' | 'haciaId' | 'montoCentavos'>,
  saldoDesde: Centavos,
): string | null {
  if (desdeId === haciaId) return 'Elige dos cuentas distintas';
  if (montoCentavos <= 0) return 'Escribe un importe';
  if (montoCentavos > saldoDesde) return 'No alcanza el saldo';
  return null;
}

/**
 * Una transferencia es UN movimiento. Su dueño se elige para que la meta de
 * ahorro lo cuente bien (sólo mira movimientos cuya cuenta es flexible):
 *  - hacia una flexible: `aporte` de la flexible;
 *  - desde una flexible hacia una diaria: `retiro` de la flexible;
 *  - diaria → diaria: `aporte` de la de destino.
 */
export function armarTransferencia(
  datos: DatosTransferencia,
  cuentas: readonly Cuenta[],
): NuevoMovimientoCuenta {
  const desde = cuentas.find((cuenta) => cuenta.id === datos.desdeId);
  const hacia = cuentas.find((cuenta) => cuenta.id === datos.haciaId);
  if (!desde || !hacia) throw new Error('La cuenta de la transferencia no existe');
  if (desde.id === hacia.id) throw new Error('No se puede transferir a la misma cuenta');

  const sacaDelAhorro = desde.tipo === 'flexible' && hacia.tipo === 'diaria';
  const dueno = sacaDelAhorro ? desde : hacia;
  const contraparte = sacaDelAhorro ? hacia : desde;
  const entraAlAhorro = hacia.tipo === 'flexible';

  return {
    cuentaId: dueno.id,
    contraparteId: contraparte.id,
    gastoId: null,
    tipo: sacaDelAhorro ? 'retiro' : 'aporte',
    montoCentavos: datos.montoCentavos,
    nota: datos.nota,
    fecha: datos.fecha,
    ...(entraAlAhorro ? { origen: datos.origen ?? 'sueldo' } : {}),
  };
}
