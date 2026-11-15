import { reposEnMemoria, UBER } from '@/lib/pruebas/repos-en-memoria';

import { cobrarSuscripciones, cobrosPendientes } from '../services/cobro-automatico';
import type { SuscripcionesRepository } from '../services/suscripciones.repository';
import type { Suscripcion } from '../suscripciones.types';
import { cobradaHastaAlCrear, proximoCobro } from '../utils/validar-suscripcion';

function base(cambios: Partial<Suscripcion> = {}): Suscripcion {
  return {
    id: 1,
    nombre: 'Claude',
    montoCentavos: 2_000,
    categoria: 'ocio',
    metodoPago: 'efectivo',
    cuentaId: null,
    diaCobro: 17,
    activa: true,
    cobradaHasta: '2026-11-10',
    creadoEn: 'ahora',
    ...cambios,
  };
}

function conSuscripciones(lista: Suscripcion[]) {
  const suscripciones = {
    listar: async () => lista,
    marcarCobradaHasta: async (id: number, hasta: string) => {
      const s = lista.find((x) => x.id === id);
      if (s) s.cobradaHasta = hasta;
    },
  } as Partial<SuscripcionesRepository> as SuscripcionesRepository;
  const repos = reposEnMemoria();
  return { repos: { ...repos, suscripciones }, lista, guardado: repos.guardado };
}

describe('cobros pendientes', () => {
  it('cobra el día 17 cuando llega, sin contar lo ya atendido', () => {
    expect(cobrosPendientes(17, '2026-11-10', '2026-11-16')).toEqual([]);
    expect(cobrosPendientes(17, '2026-11-10', '2026-11-17')).toEqual(['2026-11-17']);
    expect(cobrosPendientes(17, '2026-11-17', '2026-11-30')).toEqual([]);
  });

  it('el día 31 se ajusta al último día de febrero y de los meses de 30', () => {
    expect(cobrosPendientes(31, '2027-01-31', '2027-03-01')).toEqual(['2027-02-28']);
    expect(cobrosPendientes(31, '2026-03-31', '2026-05-01')).toEqual(['2026-04-30']);
    expect(cobrosPendientes(31, '2028-01-31', '2028-02-29')).toEqual(['2028-02-29']);
  });

  it('cuenta varios meses perdidos, con tope de 12', () => {
    expect(cobrosPendientes(1, '2026-08-15', '2026-11-15')).toEqual([
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
    ]);
    expect(cobrosPendientes(1, '2020-01-01', '2026-11-15')).toHaveLength(12);
  });

  it('al crear nada se cobra hacia atrás; con "cobrar hoy" sí cuenta la de hoy', () => {
    const hoy = '2026-11-17';
    expect(cobrosPendientes(17, cobradaHastaAlCrear(hoy, false), hoy)).toEqual([]);
    expect(cobrosPendientes(17, cobradaHastaAlCrear(hoy, true), hoy)).toEqual([hoy]);
  });

  it('el próximo cobro respeta lo ya atendido', () => {
    expect(proximoCobro(17, '2026-11-10')).toBe('2026-11-17');
    expect(proximoCobro(17, '2026-11-17')).toBe('2026-11-17');
    expect(proximoCobro(17, '2026-11-17', '2026-11-17')).toBe('2026-12-17');
    expect(proximoCobro(31, '2027-02-10')).toBe('2027-02-28');
  });
});

describe('cobrarSuscripciones', () => {
  it('registra un gasto con la fecha del cobro y avanza la marca', async () => {
    const { repos, lista, guardado } = conSuscripciones([base()]);
    const n = await cobrarSuscripciones(repos, '2026-11-20');

    expect(n).toBe(1);
    expect(guardado.gastos).toMatchObject([
      { montoCentavos: 2_000, nota: 'Claude', fecha: '2026-11-17', origen: 'suscripcion' },
    ]);
    expect(lista[0].cobradaHasta).toBe('2026-11-20');

    expect(await cobrarSuscripciones(repos, '2026-11-20')).toBe(0);
    expect(guardado.gastos).toHaveLength(1);
  });

  it('cobra cada mes perdido con su fecha', async () => {
    const { repos, guardado } = conSuscripciones([base({ cobradaHasta: '2026-08-20' })]);
    await cobrarSuscripciones(repos, '2026-11-20');
    expect(guardado.gastos.map((g) => g.fecha)).toEqual(['2026-09-17', '2026-10-17', '2026-11-17']);
  });

  it('una suscripción pausada no se cobra', async () => {
    const { repos, guardado } = conSuscripciones([base({ activa: false })]);
    expect(await cobrarSuscripciones(repos, '2026-11-30')).toBe(0);
    expect(guardado.gastos).toHaveLength(0);
  });

  it('una app del exterior con débito produce el consumo, el IVA y el ISD', async () => {
    const { repos, guardado } = conSuscripciones([
      base({ categoria: UBER.id, metodoPago: 'debito', cuentaId: 3 }),
    ]);
    await cobrarSuscripciones(repos, '2026-11-20');
    expect(guardado.gastos).toHaveLength(3);
    expect(guardado.gastos[0]).toMatchObject({ cuentaId: 3, origen: 'suscripcion' });
  });
});
