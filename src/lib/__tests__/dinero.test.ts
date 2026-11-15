import { aCentavos, interpretarImporte, porcentaje, sumar } from '../dinero';
import { formatMoneda, formatMonedaConSigno, formatMonedaEntera } from '../format';

describe('dinero', () => {
  it('convierte a centavos sin el error binario de 1.005', () => {
    expect(aCentavos(1.005)).toBe(101);
    expect(aCentavos(0.1 + 0.2)).toBe(30);
    expect(aCentavos(350)).toBe(35_000);
  });

  it('suma en centavos de forma exacta', () => {
    expect(sumar(Array(100).fill(35))).toBe(3_500);
  });

  it.each([
    ['12.50', 1_250],
    ['12,50', 1_250],
    ['12,5', 1_250],
    ['$ 4.75', 475],
    ['1,234.50', 123_450],
    ['1.234,50', 123_450],
    ['1,234', 123_400],
    ['7', 700],
  ])('interpreta "%s" como %i centavos', (texto, esperado) => {
    expect(interpretarImporte(texto)).toBe(esperado);
  });

  it.each([
    ['US$ 4.50', 450],
    ['US$4,50', 450],
    ['4.50 USD', 450],
    ['USD\u00a012.00', 1_200],
  ])('entiende el importe con moneda que manda Wallet: %p', (texto, esperado) => {
    expect(interpretarImporte(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '0', '-5', '1.2.3', '$', undefined, null])('rechaza %p', (texto) => {
    expect(interpretarImporte(texto)).toBeNull();
  });

  it('calcula porcentajes sin dividir por cero', () => {
    expect(porcentaje(50, 200)).toBe(25);
    expect(porcentaje(0, 0)).toBe(0);
    expect(porcentaje(10, 0)).toBe(100);
  });
});

describe('format', () => {
  it('usa coma para miles y punto para decimales, con espacio tras el $', () => {
    expect(formatMoneda(123_456_789)).toBe('$ 1,234,567.89');
    expect(formatMoneda(-450)).toBe('-$ 4.50');
    expect(formatMoneda(0)).toBe('$ 0.00');
  });

  it('omite los centavos en cifras redondas', () => {
    expect(formatMonedaEntera(50_000)).toBe('$ 500');
    expect(formatMonedaEntera(12_550)).toBe('$ 125.50');
  });

  it('pone signo explícito en movimientos', () => {
    expect(formatMonedaConSigno(35_000)).toBe('+$ 350.00');
    expect(formatMonedaConSigno(-450)).toBe('-$ 4.50');
  });
});
