import { mesQueContiene, quincenaQueContiene } from '@/lib/periodos';
import type { MovimientoCuenta } from '@/modules/cuentas/cuentas.types';

import {
  ahorroNetoEn,
  aportesDeSueldoEn,
  aportesExtraEn,
  movimientosDeLaMeta,
} from '../utils/calculos-ahorro';

const AHORRO = 1;
const OTRO_AHORRO = 2;
const DIARIA = 3;
const FLEXIBLES = new Set([AHORRO, OTRO_AHORRO]);

let id = 0;
function movimiento(parcial: Partial<MovimientoCuenta>): MovimientoCuenta {
  id += 1;
  return {
    id,
    cuentaId: AHORRO,
    contraparteId: null,
    gastoId: null,
    tipo: 'aporte',
    montoCentavos: 1_000,
    nota: null,
    fecha: '2026-11-16',
    creadoEn: '2026-11-16T08:00:00Z',
    ...parcial,
  };
}

describe('origen del aporte', () => {
  const quincena = quincenaQueContiene('2026-11-20');
  const mes = mesQueContiene('2026-11-20');

  it('un aporte extra cuenta para el mes pero no para el aporte del cobro', () => {
    const movimientos = [
      movimiento({ montoCentavos: 25_000, contraparteId: DIARIA, origen: 'sueldo' }),
      movimiento({ montoCentavos: 2_000, origen: 'extra' }),
    ];
    expect(ahorroNetoEn(movimientos, mes)).toBe(27_000);
    expect(aportesDeSueldoEn(movimientos, quincena)).toBe(25_000);
    expect(aportesExtraEn(movimientos, quincena)).toBe(2_000);
  });

  it('sólo un extra no cumple el aporte del cobro', () => {
    const movimientos = [movimiento({ montoCentavos: 25_000, origen: 'extra' })];
    expect(aportesDeSueldoEn(movimientos, quincena)).toBe(0);
    expect(ahorroNetoEn(movimientos, mes)).toBe(25_000);
  });

  it('sin origen (aportes viejos) cuenta como sueldo', () => {
    const movimientos = [movimiento({ montoCentavos: 25_000 }), movimiento({ origen: null })];
    expect(aportesDeSueldoEn(movimientos, quincena)).toBe(26_000);
    expect(aportesExtraEn(movimientos, quincena)).toBe(0);
  });

  it('los retiros siguen restando del aporte del cobro', () => {
    const movimientos = [
      movimiento({ montoCentavos: 25_000 }),
      movimiento({ montoCentavos: 2_000, origen: 'extra' }),
      movimiento({ tipo: 'retiro', montoCentavos: 5_000 }),
    ];
    expect(aportesDeSueldoEn(movimientos, quincena)).toBe(20_000);
    expect(ahorroNetoEn(movimientos, mes)).toBe(22_000);
  });
});

describe('movimientosDeLaMeta', () => {
  it('deja fuera las cuentas del día a día y los pases entre dos ahorros', () => {
    const desdeLaDiaria = movimiento({ contraparteId: DIARIA });
    const deFuera = movimiento({ origen: 'extra' });
    const entreAhorros = movimiento({ cuentaId: OTRO_AHORRO, contraparteId: AHORRO });
    const retiroAOtroAhorro = movimiento({ tipo: 'retiro', contraparteId: OTRO_AHORRO });
    const enLaDiaria = movimiento({ cuentaId: DIARIA });

    const deLaMeta = movimientosDeLaMeta(
      [desdeLaDiaria, deFuera, entreAhorros, retiroAOtroAhorro, enLaDiaria],
      FLEXIBLES,
    );

    expect(deLaMeta).toEqual([desdeLaDiaria, deFuera]);
    expect(ahorroNetoEn(deLaMeta, mesQueContiene('2026-11-20'))).toBe(2_000);
  });
});
