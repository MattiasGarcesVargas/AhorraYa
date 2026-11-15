import { centavosAEntrada, entradaACentavos, pulsarTecla, type Tecla } from '../entrada-monto';

function teclear(teclas: Tecla[], inicial = ''): string {
  return teclas.reduce(pulsarTecla, inicial);
}

describe('teclado de importes', () => {
  it('escribe un importe con decimales', () => {
    const entrada = teclear(['1', '2', '.', '5', '0']);
    expect(entrada).toBe('12.50');
    expect(entradaACentavos(entrada)).toBe(1_250);
  });

  it('no admite más de dos decimales ni dos puntos', () => {
    expect(teclear(['1', '.', '2', '3', '4'])).toBe('1.23');
    expect(teclear(['1', '.', '.', '5'])).toBe('1.5');
  });

  it('un punto al inicio se escribe como 0.', () => {
    expect(teclear(['.', '5'])).toBe('0.5');
    expect(entradaACentavos('0.5')).toBe(50);
  });

  it('ignora ceros a la izquierda', () => {
    expect(teclear(['0', '0', '7'])).toBe('7');
  });

  it('borra de a un carácter', () => {
    expect(teclear(['borrar'], '12.5')).toBe('12.');
    expect(teclear(['borrar'], '')).toBe('');
  });

  it('no pasa del tope de un millón', () => {
    expect(teclear(['9', '9', '9', '9', '9', '9', '9', '9'])).toBe('999999');
  });

  it('carga un valor existente y vuelve al mismo importe', () => {
    for (const centavos of [0, 50, 1_250, 35_000, 12_345]) {
      expect(entradaACentavos(centavosAEntrada(centavos))).toBe(centavos);
    }
    expect(centavosAEntrada(35_000)).toBe('350');
    expect(centavosAEntrada(1_250)).toBe('12.5');
  });
});
