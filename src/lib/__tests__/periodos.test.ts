import {
  desplazarPeriodo,
  diasRestantes,
  etiquetaPeriodo,
  mesQueContiene,
  quincenaQueContiene,
  quincenasHastaAtras,
} from '../periodos';

/**
 * Casos sacados del plan: los pagos son el 15 y el último día del mes, y la
 * quincena va de pago a pago. El primer mes del plan va del 15 nov al 14 dic.
 */
describe('quincenas de pago a pago', () => {
  it.each([
    ['2026-11-15', '2026-11-15', '2026-11-29'],
    ['2026-11-22', '2026-11-15', '2026-11-29'],
    ['2026-11-29', '2026-11-15', '2026-11-29'],
    ['2026-11-30', '2026-11-30', '2026-12-14'],
    ['2026-12-01', '2026-11-30', '2026-12-14'],
    ['2026-12-14', '2026-11-30', '2026-12-14'],
    ['2026-11-08', '2026-10-31', '2026-11-14'],
    // Febrero: el último día es el 28.
    ['2027-02-28', '2027-02-28', '2027-03-14'],
    ['2027-02-27', '2027-02-15', '2027-02-27'],
  ])('%s cae en %s – %s', (fecha, inicio, fin) => {
    expect(quincenaQueContiene(fecha)).toEqual({ tipo: 'quincena', inicio, fin });
  });

  it('recorre quincenas hacia atrás y hacia adelante sin huecos', () => {
    const actual = quincenaQueContiene('2026-11-20');
    expect(desplazarPeriodo(actual, 1)).toEqual({
      tipo: 'quincena',
      inicio: '2026-11-30',
      fin: '2026-12-14',
    });
    expect(desplazarPeriodo(actual, -1)).toEqual({
      tipo: 'quincena',
      inicio: '2026-10-31',
      fin: '2026-11-14',
    });
    expect(desplazarPeriodo(actual, -2)).toEqual({
      tipo: 'quincena',
      inicio: '2026-10-15',
      fin: '2026-10-30',
    });
  });

  it('lista las últimas quincenas de la más reciente a la más antigua', () => {
    const lista = quincenasHastaAtras('2026-12-01', 3).map((p) => p.inicio);
    expect(lista).toEqual(['2026-11-30', '2026-11-15', '2026-10-31']);
  });
});

describe('meses y días restantes', () => {
  it('el mes es el de calendario', () => {
    expect(mesQueContiene('2026-11-08')).toEqual({
      tipo: 'mes',
      inicio: '2026-11-01',
      fin: '2026-11-30',
    });
  });

  it('cuenta hoy como día disponible', () => {
    const quincena = quincenaQueContiene('2026-11-15');
    expect(diasRestantes(quincena, '2026-11-15')).toBe(15);
    expect(diasRestantes(quincena, '2026-11-29')).toBe(1);
    expect(diasRestantes(quincena, '2026-11-30')).toBe(0);
  });

  it('etiqueta los periodos en español corto', () => {
    expect(etiquetaPeriodo(quincenaQueContiene('2026-11-20'))).toBe('15 – 29 nov');
    expect(etiquetaPeriodo(quincenaQueContiene('2026-12-01'))).toBe('30 nov – 14 dic');
  });
});
