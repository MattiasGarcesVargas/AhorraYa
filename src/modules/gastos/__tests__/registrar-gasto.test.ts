import { reposEnMemoria } from '@/lib/pruebas/repos-en-memoria';
import { retirar } from '@/modules/cuentas/services/retiro-con-gasto';

import type { NuevoGasto } from '../gastos.types';
import {
  actualizarGasto,
  eliminarGasto,
  registrarDevolucionesIsd,
  registrarGasto,
  totalCobrado,
} from '../services/registrar-gasto';
import { consumoDeCobrado, desglosarExterior } from '../utils/impuestos-exterior';

const uber = (cambios: Partial<NuevoGasto> = {}): NuevoGasto => ({
  montoCentavos: 250,
  categoria: 'uber',
  metodoPago: 'debito',
  cuentaId: 1,
  nota: null,
  fecha: '2026-11-13',
  origen: 'app',
  ...cambios,
});

describe('impuestos de un consumo del exterior', () => {
  it.each([
    // Los consumos reales del estado de cuenta (noviembre 2026).
    [231, 35, 12, 278, 266],
    [272, 41, 14, 327, 313],
    [99, 15, 5, 119, 114],
    [200, 30, 10, 240, 230],
  ])('consumo de %i centavos', (consumo, iva, isd, cobrado, costoReal) => {
    expect(desglosarExterior(consumo)).toEqual({ consumo, iva, isd, cobrado, costoReal });
  });

  it('del total cobrado se recupera el consumo', () => {
    expect(consumoDeCobrado(278)).toBe(231);
    expect(consumoDeCobrado(301)).toBe(250);
  });
});

describe('registrar un gasto', () => {
  it('Uber con débito crea el consumo, el IVA y el ISD enlazados', async () => {
    const repos = reposEnMemoria();

    const registro = await registrarGasto(repos, uber());

    expect(repos.guardado.gastos.map((g) => [g.impuesto ?? null, g.montoCentavos])).toEqual([
      [null, 250],
      ['iva', 38],
      ['isd', 13],
    ]);
    expect(totalCobrado(registro)).toBe(301);
    for (const impuesto of registro.impuestos) {
      expect(impuesto).toMatchObject({
        gastoPadreId: registro.gasto.id,
        categoria: 'uber',
        metodoPago: 'debito',
        cuentaId: 1,
        fecha: '2026-11-13',
      });
    }
  });

  it('con crédito también; en efectivo o por transferencia, no', async () => {
    const repos = reposEnMemoria();
    const impuestosCon = async (cambios: Partial<NuevoGasto>) =>
      (await registrarGasto(repos, uber(cambios))).impuestos;

    expect(await impuestosCon({ metodoPago: 'credito', cuentaId: null })).toHaveLength(2);
    expect(await impuestosCon({ metodoPago: 'efectivo', cuentaId: null })).toHaveLength(0);
    expect(await impuestosCon({ metodoPago: 'transferencia' })).toHaveLength(0);
  });

  it('una categoría que no es del exterior no lleva impuestos', async () => {
    const repos = reposEnMemoria();

    const registro = await registrarGasto(repos, uber({ categoria: 'transporte' }));

    expect(registro.impuestos).toHaveLength(0);
    expect(repos.guardado.gastos).toHaveLength(1);
  });
});

describe('corregir o eliminar un gasto con impuestos', () => {
  it('al cambiar el importe o la fecha, los impuestos se recalculan', async () => {
    const repos = reposEnMemoria();
    const { gasto } = await registrarGasto(repos, uber());

    await actualizarGasto(repos, gasto.id, { ...uber(), montoCentavos: 231, fecha: '2026-11-12' });

    expect(repos.guardado.gastos.map((g) => [g.montoCentavos, g.fecha])).toEqual([
      [231, '2026-11-12'],
      [35, '2026-11-12'],
      [12, '2026-11-12'],
    ]);
  });

  it('si pasa a efectivo, los impuestos y su devolución desaparecen', async () => {
    const repos = reposEnMemoria();
    const { gasto } = await registrarGasto(repos, uber());
    await registrarDevolucionesIsd(repos, '2026-11-14');
    expect(repos.guardado.ingresos).toHaveLength(1);

    await actualizarGasto(repos, gasto.id, { ...uber(), metodoPago: 'efectivo', cuentaId: null });

    expect(repos.guardado.gastos).toHaveLength(1);
    expect(repos.guardado.ingresos).toHaveLength(0);
  });

  it('si pasa a ser del exterior, los impuestos aparecen', async () => {
    const repos = reposEnMemoria();
    const { gasto } = await registrarGasto(repos, uber({ categoria: 'transporte' }));

    await actualizarGasto(repos, gasto.id, uber());

    expect(repos.guardado.gastos).toHaveLength(3);
  });

  it('una devolución ya registrada sigue al consumo corregido', async () => {
    const repos = reposEnMemoria();
    const { gasto } = await registrarGasto(repos, uber());
    await registrarDevolucionesIsd(repos, '2026-11-14');

    await actualizarGasto(repos, gasto.id, { ...uber(), montoCentavos: 272, fecha: '2026-11-10' });

    expect(repos.guardado.ingresos[0]).toMatchObject({ montoCentavos: 14, fecha: '2026-11-11' });
  });

  it('eliminar el consumo se lleva impuestos y devolución', async () => {
    const repos = reposEnMemoria();
    const { gasto } = await registrarGasto(repos, uber());
    await registrarDevolucionesIsd(repos, '2026-11-14');

    await eliminarGasto(repos, gasto.id);

    expect(repos.guardado.gastos).toHaveLength(0);
    expect(repos.guardado.ingresos).toHaveLength(0);
  });
});

describe('devolución del ISD', () => {
  it('se registra al día siguiente del consumo, en la misma cuenta, una sola vez', async () => {
    const repos = reposEnMemoria();
    await registrarGasto(repos, uber());

    expect(await registrarDevolucionesIsd(repos, '2026-11-13')).toBe(0);
    expect(await registrarDevolucionesIsd(repos, '2026-11-14')).toBe(1);
    expect(await registrarDevolucionesIsd(repos, '2026-11-20')).toBe(0);

    expect(repos.guardado.ingresos).toHaveLength(1);
    expect(repos.guardado.ingresos[0]).toMatchObject({
      tipo: 'reembolso',
      montoCentavos: 13,
      cuentaId: 1,
      fecha: '2026-11-14',
      nota: 'Devolución ISD · Uber',
    });
  });

  it('si salió de un retiro del ahorro, el retiro vale lo cobrado y el ISD vuelve a esa cuenta', async () => {
    const repos = reposEnMemoria();

    const { retiro } = await retirar(repos, {
      cuentaId: 2,
      montoCentavos: 250,
      fecha: '2026-11-13',
      gasto: { categoria: 'uber', metodoPago: 'debito', descripcion: null },
      nota: 'Uber',
      haciaCuentaId: null,
    });
    await registrarDevolucionesIsd(repos, '2026-11-14');

    expect(retiro.montoCentavos).toBe(301);
    expect(repos.guardado.ingresos[0]).toMatchObject({ cuentaId: 2, montoCentavos: 13 });
  });
});
