import type { Cuenta, MovimientoCuenta } from '../cuentas.types';
import { calcularSaldos, efectoEnCuenta } from '../utils/saldos';
import { armarTransferencia, validarTransferencia } from '../utils/transferencia';

const base: Cuenta = {
  id: 1,
  banco: 'pichincha',
  nombre: 'Diaria A',
  tipo: 'diaria',
  orden: 0,
  creadoEn: '2026-11-01T00:00:00Z',
};
const DIARIA_A = base;
const DIARIA_B: Cuenta = { ...base, id: 2, nombre: 'Diaria B' };
const FLEX_A: Cuenta = { ...base, id: 3, nombre: 'Flex A', tipo: 'flexible' };
const FLEX_B: Cuenta = { ...base, id: 4, nombre: 'Flex B', tipo: 'flexible' };
const CUENTAS = [DIARIA_A, DIARIA_B, FLEX_A, FLEX_B];

const DATOS = { montoCentavos: 10_000, nota: null, fecha: '2026-11-10' } as const;

function inicial(cuenta: Cuenta): MovimientoCuenta {
  return {
    id: cuenta.id,
    cuentaId: cuenta.id,
    contraparteId: null,
    gastoId: null,
    tipo: 'inicial',
    montoCentavos: 50_000,
    nota: null,
    fecha: '2026-11-01',
    creadoEn: '2026-11-01T00:00:00Z',
  };
}

function saldosTras(desdeId: number, haciaId: number): Record<number, number> {
  const transferencia = {
    ...armarTransferencia({ ...DATOS, desdeId, haciaId }, CUENTAS),
    id: 99,
    creadoEn: '2026-11-10T10:00:00Z',
  };
  const saldos = calcularSaldos(
    CUENTAS,
    {
      movimientos: [...CUENTAS.map(inicial), transferencia],
      gastosPorDia: [],
      ingresosPorDia: [],
      tasas: [],
    },
    '2026-11-10',
  );
  return Object.fromEntries(saldos.map((s) => [s.cuenta.id, s.saldo]));
}

describe('armarTransferencia', () => {
  it('diaria → flexible: aporte de la flexible, con origen', () => {
    const m = armarTransferencia({ ...DATOS, desdeId: 1, haciaId: 3, origen: 'extra' }, CUENTAS);
    expect(m).toMatchObject({ tipo: 'aporte', cuentaId: 3, contraparteId: 1, origen: 'extra' });
    expect(saldosTras(1, 3)).toMatchObject({ 1: 40_000, 3: 60_000 });
  });

  it('el origen es "sueldo" por omisión', () => {
    expect(armarTransferencia({ ...DATOS, desdeId: 1, haciaId: 3 }, CUENTAS).origen).toBe('sueldo');
  });

  it('flexible → diaria: retiro de la flexible, sin origen', () => {
    const m = armarTransferencia({ ...DATOS, desdeId: 3, haciaId: 1, origen: 'extra' }, CUENTAS);
    expect(m).toMatchObject({ tipo: 'retiro', cuentaId: 3, contraparteId: 1 });
    expect(m.origen).toBeUndefined();
    expect(saldosTras(3, 1)).toMatchObject({ 3: 40_000, 1: 60_000 });
  });

  it('diaria → diaria: aporte de la de destino, sin origen', () => {
    const m = armarTransferencia({ ...DATOS, desdeId: 1, haciaId: 2 }, CUENTAS);
    expect(m).toMatchObject({ tipo: 'aporte', cuentaId: 2, contraparteId: 1 });
    expect(m.origen).toBeUndefined();
    expect(saldosTras(1, 2)).toMatchObject({ 1: 40_000, 2: 60_000 });
  });

  it('flexible → flexible: aporte de la de destino', () => {
    const m = armarTransferencia({ ...DATOS, desdeId: 3, haciaId: 4 }, CUENTAS);
    expect(m).toMatchObject({ tipo: 'aporte', cuentaId: 4, contraparteId: 3 });
    expect(saldosTras(3, 4)).toMatchObject({ 3: 40_000, 4: 60_000 });
    expect(efectoEnCuenta(m, 3)).toBe(-10_000);
  });

  it('rechaza la misma cuenta o una cuenta que no existe', () => {
    expect(() => armarTransferencia({ ...DATOS, desdeId: 1, haciaId: 1 }, CUENTAS)).toThrow();
    expect(() => armarTransferencia({ ...DATOS, desdeId: 1, haciaId: 99 }, CUENTAS)).toThrow();
  });
});

describe('validarTransferencia', () => {
  it('valida cuentas, importe y saldo', () => {
    expect(validarTransferencia({ desdeId: 1, haciaId: 1, montoCentavos: 5 }, 100)).not.toBeNull();
    expect(validarTransferencia({ desdeId: 1, haciaId: 2, montoCentavos: 0 }, 100)).not.toBeNull();
    expect(
      validarTransferencia({ desdeId: 1, haciaId: 2, montoCentavos: 101 }, 100),
    ).not.toBeNull();
    expect(validarTransferencia({ desdeId: 1, haciaId: 2, montoCentavos: 100 }, 100)).toBeNull();
  });
});
