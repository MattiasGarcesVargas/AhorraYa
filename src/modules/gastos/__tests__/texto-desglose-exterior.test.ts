import { textoDesgloseExterior } from '../utils/texto-desglose-exterior';

describe('textoDesgloseExterior', () => {
  it('dice el IVA, el ISD y lo que cobra el banco en total', () => {
    expect(textoDesgloseExterior(250)).toBe(
      '+ IVA $ 0.38 · ISD $ 0.13 (vuelve mañana) · se cobran $ 3.01',
    );
  });
});
