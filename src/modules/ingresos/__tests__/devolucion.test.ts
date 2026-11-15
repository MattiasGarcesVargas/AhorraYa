import { esDevolucionIsd } from '../utils/devolucion';

describe('esDevolucionIsd', () => {
  it('lo es un reembolso enlazado a un gasto de ISD', () => {
    expect(esDevolucionIsd({ tipo: 'reembolso', gastoId: 7 })).toBe(true);
  });

  it('no lo es un reembolso cualquiera', () => {
    expect(esDevolucionIsd({ tipo: 'reembolso', gastoId: null })).toBe(false);
    expect(esDevolucionIsd({ tipo: 'reembolso' })).toBe(false);
  });

  it('no lo es otro tipo de ingreso', () => {
    expect(esDevolucionIsd({ tipo: 'sueldo', gastoId: 7 })).toBe(false);
  });
});
