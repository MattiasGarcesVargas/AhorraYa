import { totalizar, type SaldoCuenta } from '@/modules/cuentas/utils/saldos';
import { armarTransferencia } from '@/modules/cuentas/utils/transferencia';
import type { Cuenta } from '@/modules/cuentas/cuentas.types';

import { billeteraDe, cuentaDelGasto, cuentasDeBanco } from '../utils/cuenta-del-gasto';

const cuenta = (id: number, tipo: Cuenta['tipo']): Cuenta => ({
  id,
  banco: tipo === 'efectivo' ? 'efectivo' : 'pichincha',
  nombre: `Cuenta ${id}`,
  tipo,
  orden: id,
  creadoEn: 'ahora',
});
const CUENTAS = [cuenta(1, 'diaria'), cuenta(2, 'flexible'), cuenta(3, 'efectivo')];

describe('de qué cuenta sale un gasto', () => {
  it('en efectivo sale de la billetera, sin elegir', () => {
    expect(cuentaDelGasto('efectivo', 1, billeteraDe(CUENTAS))).toBe(3);
  });

  it('sin billetera, el efectivo no toca ninguna cuenta', () => {
    expect(cuentaDelGasto('efectivo', 1, billeteraDe(CUENTAS.slice(0, 2)))).toBeNull();
  });

  it('con débito o transferencia sale de la cuenta elegida; con crédito, de ninguna', () => {
    expect(cuentaDelGasto('debito', 1, 3)).toBe(1);
    expect(cuentaDelGasto('transferencia', 2, 3)).toBe(2);
    expect(cuentaDelGasto('credito', 1, 3)).toBeNull();
  });

  it('la billetera no se ofrece como cuenta del banco', () => {
    expect(cuentasDeBanco(CUENTAS).map((c) => c.id)).toEqual([1, 2]);
  });
});

describe('la billetera en los totales', () => {
  it('el efectivo es parte de lo que hay para gastar, no del ahorro', () => {
    const saldos = CUENTAS.map((c, i) => ({ cuenta: c, saldo: [5_000, 80_000, 2_000][i] }));
    expect(totalizar(saldos as SaldoCuenta[])).toMatchObject({
      patrimonio: 87_000,
      ahorros: 80_000,
      disponible: 7_000,
      efectivo: 2_000,
    });
  });

  it('sacar del ahorro a la billetera cuenta como retiro del ahorro', () => {
    const transferencia = armarTransferencia(
      { desdeId: 2, haciaId: 3, montoCentavos: 2_000, nota: null, fecha: '2026-11-15' },
      CUENTAS,
    );
    expect(transferencia).toMatchObject({ cuentaId: 2, contraparteId: 3, tipo: 'retiro' });
  });

  it('retirar del cajero (día a día → billetera) no toca el ahorro', () => {
    const transferencia = armarTransferencia(
      { desdeId: 1, haciaId: 3, montoCentavos: 2_000, nota: null, fecha: '2026-11-15' },
      CUENTAS,
    );
    expect(transferencia).toMatchObject({ cuentaId: 3, contraparteId: 1, tipo: 'aporte' });
  });
});
