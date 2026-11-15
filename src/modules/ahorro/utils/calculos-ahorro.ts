import type { Centavos } from '@/lib/dinero';
import { contieneFecha, type Periodo } from '@/lib/periodos';

import type { MovimientoCuenta } from '@/modules/cuentas/cuentas.types';

import type { MovimientoAhorro } from '../ahorro.types';

function conSigno(movimiento: MovimientoAhorro): Centavos {
  // El ajuste ya trae su signo; el retiro se guarda en positivo y resta.
  return movimiento.tipo === 'retiro' ? -movimiento.montoCentavos : movimiento.montoCentavos;
}

/**
 * Lo registrado en las cuentas de ahorro: inicial + aportes − retiros ±
 * ajustes. NO incluye el interés (ese sale de `cuentas/utils/saldos.ts`): es
 * el saldo "de libro" que usa el estado de cuenta.
 */
export function saldoAhorro(movimientos: readonly MovimientoAhorro[]): Centavos {
  return movimientos.reduce((total, movimiento) => total + conSigno(movimiento), 0);
}

/**
 * Lo que de verdad se ahorró en un periodo: aportes menos retiros. El saldo
 * inicial y los ajustes no cuentan — no son ahorro de este periodo.
 *
 * Se restan los retiros a propósito: apartar $250 y sacar $100 a la semana
 * no es haber cumplido los $250.
 */
export function ahorroNetoEn(movimientos: readonly MovimientoAhorro[], periodo: Periodo): Centavos {
  return movimientos
    .filter(
      (movimiento) =>
        (movimiento.tipo === 'aporte' || movimiento.tipo === 'retiro') &&
        contieneFecha(periodo, movimiento.fecha),
    )
    .reduce((total, movimiento) => total + conSigno(movimiento), 0);
}

function esAporteExtra(movimiento: MovimientoAhorro): boolean {
  return movimiento.tipo === 'aporte' && movimiento.origen === 'extra';
}

/**
 * Lo apartado DEL SUELDO en un periodo de cobro: como `ahorroNetoEn`, pero los
 * aportes extra (plata que no salió del sueldo: un regalo, un cachuelo) no
 * cuentan. Es la medida del "págate primero". Los retiros siguen restando.
 */
export function aportesDeSueldoEn(
  movimientos: readonly MovimientoAhorro[],
  periodo: Periodo,
): Centavos {
  return ahorroNetoEn(
    movimientos.filter((movimiento) => !esAporteExtra(movimiento)),
    periodo,
  );
}

/** Los aportes extra de un periodo: suman a la meta del mes, no al aporte del cobro. */
export function aportesExtraEn(
  movimientos: readonly MovimientoAhorro[],
  periodo: Periodo,
): Centavos {
  return movimientos
    .filter((movimiento) => esAporteExtra(movimiento) && contieneFecha(periodo, movimiento.fecha))
    .reduce((total, movimiento) => total + movimiento.montoCentavos, 0);
}

/**
 * Los movimientos que cuentan para la meta: los de las cuentas de ahorro
 * (flexibles), menos los pases entre dos de ellas — mover plata de un ahorro a
 * otro no cambia lo ahorrado.
 */
export function movimientosDeLaMeta<T extends Pick<MovimientoCuenta, 'cuentaId' | 'contraparteId'>>(
  movimientos: readonly T[],
  cuentasDeAhorro: ReadonlySet<number>,
): T[] {
  return movimientos.filter(
    (movimiento) =>
      cuentasDeAhorro.has(movimiento.cuentaId) &&
      (movimiento.contraparteId === null || !cuentasDeAhorro.has(movimiento.contraparteId)),
  );
}

/** Lo que se sacó del ahorro en un periodo. La cifra que hay que vigilar. */
export function retirosEn(movimientos: readonly MovimientoAhorro[], periodo: Periodo): Centavos {
  return movimientos
    .filter(
      (movimiento) => movimiento.tipo === 'retiro' && contieneFecha(periodo, movimiento.fecha),
    )
    .reduce((total, movimiento) => total + movimiento.montoCentavos, 0);
}

/**
 * Cuánto tendría en `meses` si cumplo la meta cada mes. Es la cuenta del plan:
 * $500 × 12 = $6,000 más lo que ya tengo.
 */
export function proyeccion(saldoActual: Centavos, metaMensual: Centavos, meses = 12): Centavos {
  return saldoActual + metaMensual * meses;
}
