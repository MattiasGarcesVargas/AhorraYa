import type { TasaCuenta } from '../cuentas.types';
import {
  diasQueAcredita,
  formatTasa,
  interesDiarioEstimado,
  interpretarTasa,
  proyectarInteres,
  serieDiaria,
  tasaVigente,
} from '../utils/interes';

const CINCO: TasaCuenta[] = [{ cuentaId: 1, desde: '2026-11-01', tasaBp: 500 }];

function interesTotal(dias: { interes: number }[]): number {
  return dias.reduce((total, dia) => total + dia.interes, 0);
}

describe('interés diario', () => {
  it('saldo × tasa ÷ 365, a dos decimales y sin redondear hacia arriba', () => {
    // $2,731.94 × 4.75 % ÷ 365 = $0.3555… → 35 centavos, no 36.
    expect(interesDiarioEstimado(273_194, 475)).toBe(35);
    // $2,700 × 5 % ÷ 365 = $0.3698… → 36 centavos.
    expect(interesDiarioEstimado(270_000, 500)).toBe(36);
  });

  it('paga al día siguiente sobre el saldo con el que se cerró la víspera', () => {
    const serie = serieDiaria([{ fecha: '2026-11-01', importe: 270_000 }], CINCO, '2026-11-03');

    // 36.99 centavos cada día: paga 36, lo que sobra del centavo no se acumula.
    expect(serie.map((dia) => dia.interes)).toEqual([0, 36, 36]);
    expect(serie.at(-1)?.saldo).toBe(270_072);
  });

  it('el viernes paga junto lo del viernes, sábado y domingo; el fin de semana, nada', () => {
    // $2,579.50 al 5 % son $0.3533 al día: el viernes llegan $1.06, no 3 × $0.35.
    const serie = serieDiaria([{ fecha: '2026-11-11', importe: 257_950 }], CINCO, '2026-11-16');

    //                              mié jue vie  sáb dom lun
    expect(serie.map((dia) => dia.interes)).toEqual([0, 35, 106, 0, 0, 35]);
    expect(['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'].map(diasQueAcredita)).toEqual([
      1, 3, 0, 0,
    ]);
  });

  it('el interés se suma al saldo y también genera interés (30 días ≈ $11.12)', () => {
    const serie = serieDiaria([{ fecha: '2026-11-01', importe: 270_000 }], CINCO, '2026-12-01');

    // Al cortar cada día se pierde menos de un centavo diario frente a la cuenta exacta.
    const exacto = 270_000 * ((1 + 0.05 / 365) ** 30 - 1);
    expect(interesTotal(serie)).toBeLessThanOrEqual(exacto);
    expect(exacto - interesTotal(serie)).toBeLessThan(30);
    // Y aun así crece: los últimos días pagan más que los primeros.
    expect(serie.at(-1)!.interes).toBeGreaterThan(serie[1].interes);
    expect(serie.at(-1)?.saldo).toBe(270_000 + interesTotal(serie));
  });

  it('un retiro a mitad de mes baja lo que se gana desde ese día', () => {
    const sinRetiro = serieDiaria([{ fecha: '2026-11-01', importe: 270_000 }], CINCO, '2026-11-30');
    const conRetiro = serieDiaria(
      [
        { fecha: '2026-11-01', importe: 270_000 },
        { fecha: '2026-11-15', importe: -100_000 },
      ],
      CINCO,
      '2026-11-30',
    );

    // Hasta el 15 (inclusive) ganan lo mismo: el retiro de ese día pesa desde el 16.
    expect(conRetiro[14].interes).toBe(sinRetiro[14].interes);
    expect(conRetiro[15].interes).toBeLessThan(sinRetiro[15].interes);
    expect(interesTotal(conRetiro)).toBeLessThan(interesTotal(sinRetiro));
  });

  it('cambiar la tasa rige desde ese día y no recalcula lo ya ganado', () => {
    const asientos = [{ fecha: '2026-11-01', importe: 270_000 }];
    const antes = serieDiaria(asientos, CINCO, '2026-11-10');
    const conCambio = serieDiaria(
      asientos,
      [...CINCO, { cuentaId: 1, desde: '2026-11-11', tasaBp: 1_000 }],
      '2026-11-20',
    );

    expect(conCambio.slice(0, 10)).toEqual(antes);
    // El saldo del 11 ya rinde al 10 %: el 12 paga el doble que el 11.
    expect(conCambio[11].interes).toBeGreaterThan(conCambio[10].interes * 1.9);
  });

  it('sin tasa, o antes de que empiece a regir, no hay interés', () => {
    const asientos = [{ fecha: '2026-10-01', importe: 270_000 }];
    expect(interesTotal(serieDiaria(asientos, [], '2026-10-31'))).toBe(0);
    expect(interesTotal(serieDiaria(asientos, CINCO, '2026-10-31'))).toBe(0);
    expect(tasaVigente(CINCO, '2026-10-31')).toBe(0);
    expect(tasaVigente(CINCO, '2026-11-01')).toBe(500);
  });

  it('ignora lo que tiene fecha posterior al día consultado', () => {
    const serie = serieDiaria(
      [
        { fecha: '2026-11-01', importe: 10_000 },
        { fecha: '2026-11-20', importe: 50_000 },
      ],
      [],
      '2026-11-10',
    );
    expect(serie).toHaveLength(10);
    expect(serie.at(-1)?.saldo).toBe(10_000);
  });

  it('una cuenta sin movimientos no tiene historia', () => {
    expect(serieDiaria([], CINCO, '2026-11-10')).toEqual([]);
  });

  it('proyecta lo que se ganaría sin tocar la cuenta', () => {
    expect(proyectarInteres(270_000, 500, 30)).toBe(1_112);
    // Un año al 5 % con capitalización diaria rinde un poco más del 5 %.
    expect(proyectarInteres(270_000, 500, 365)).toBeGreaterThan(13_500);
    expect(proyectarInteres(0, 500, 365)).toBe(0);
  });

  it('lee y escribe la tasa como porcentaje', () => {
    expect(formatTasa(500)).toBe('5%');
    expect(formatTasa(475)).toBe('4.75%');
    expect(interpretarTasa('5')).toBe(500);
    expect(interpretarTasa('4,75 %')).toBe(475);
    expect(interpretarTasa('')).toBe(0);
    expect(interpretarTasa('cinco')).toBeNull();
  });
});
