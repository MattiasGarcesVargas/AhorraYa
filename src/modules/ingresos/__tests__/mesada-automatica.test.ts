import type { Ingreso } from '../ingresos.types';
import type { IngresosRepository } from '../services/ingresos.repository';
import { acreditarMesadas, lunesPendientes } from '../services/mesada-automatica';

function repo(marca: string | null) {
  const guardados: Ingreso[] = [];
  const estado = { marca };
  const ingresos = {
    async registrar(ingreso) {
      const nuevo = { ...ingreso, id: guardados.length + 1, creadoEn: 'ahora' };
      guardados.push(nuevo);
      return nuevo;
    },
    async mesadaAcreditadaHasta() {
      return estado.marca;
    },
    async marcarMesadaAcreditada(hasta) {
      estado.marca = hasta;
    },
  } as Partial<IngresosRepository> as IngresosRepository;
  return { ingresos, guardados, estado };
}

// 10 nov 2026 es martes; los lunes siguientes son 16, 23 y 30.
const DATOS = { mesadaCentavos: 3_000, cuentaId: 1 };

describe('mesada automática de los lunes', () => {
  it('encuentra los lunes entre la última vez y hoy', () => {
    expect(lunesPendientes('2026-11-10', '2026-11-15')).toEqual([]);
    expect(lunesPendientes('2026-11-10', '2026-11-16')).toEqual(['2026-11-16']);
    expect(lunesPendientes('2026-11-10', '2026-11-30')).toEqual([
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
    ]);
    // El día de la marca no se cuenta: ya se atendió.
    expect(lunesPendientes('2026-11-16', '2026-11-16')).toEqual([]);
  });

  it('acredita cada lunes pendiente en la cuenta del día a día, con su fecha', async () => {
    const { ingresos, guardados, estado } = repo('2026-11-10');
    const anotadas = await acreditarMesadas(ingresos, { ...DATOS, hoy: '2026-11-24' });

    expect(anotadas).toBe(2);
    expect(guardados).toMatchObject([
      { montoCentavos: 3_000, tipo: 'mesada', cuentaId: 1, fecha: '2026-11-16' },
      { montoCentavos: 3_000, tipo: 'mesada', cuentaId: 1, fecha: '2026-11-23' },
    ]);
    expect(estado.marca).toBe('2026-11-24');
  });

  it('no repite: abrir la app otra vez el mismo día no anota nada', async () => {
    const { ingresos, guardados } = repo('2026-11-10');
    await acreditarMesadas(ingresos, { ...DATOS, hoy: '2026-11-16' });
    await acreditarMesadas(ingresos, { ...DATOS, hoy: '2026-11-16' });
    await acreditarMesadas(ingresos, { ...DATOS, hoy: '2026-11-18' });
    expect(guardados).toHaveLength(1);
  });

  it('con la mesada en 0 o la primera vez sólo avanza la marca', async () => {
    const apagada = repo('2026-11-10');
    await acreditarMesadas(apagada.ingresos, { ...DATOS, mesadaCentavos: 0, hoy: '2026-11-30' });
    expect(apagada.guardados).toHaveLength(0);
    expect(apagada.estado.marca).toBe('2026-11-30');

    const nueva = repo(null);
    await acreditarMesadas(nueva.ingresos, { ...DATOS, hoy: '2026-11-30' });
    expect(nueva.guardados).toHaveLength(0);
    expect(nueva.estado.marca).toBe('2026-11-30');
  });
});
