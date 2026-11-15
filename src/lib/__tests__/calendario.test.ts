import { inicioDeMes, moverMes, semanasDelMes } from '../calendario';

describe('calendario', () => {
  it('noviembre de 2026 empieza en domingo: seis huecos antes del día 1', () => {
    const semanas = semanasDelMes('2026-11-15');
    expect(semanas[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(semanas.flat().filter(Boolean)).toHaveLength(30);
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
  });

  it('febrero tiene 28 días y en bisiesto 29', () => {
    expect(semanasDelMes('2026-02-10').flat().filter(Boolean)).toHaveLength(28);
    expect(semanasDelMes('2028-02-10').flat().filter(Boolean)).toHaveLength(29);
  });

  it('moverse de mes cruza el año', () => {
    expect(inicioDeMes('2026-11-15')).toBe('2026-11-01');
    expect(moverMes('2026-01-20', -1)).toBe('2025-12-01');
    expect(moverMes('2026-12-31', 1)).toBe('2027-01-01');
  });
});
