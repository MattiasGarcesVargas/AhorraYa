import type { Gasto } from '@/modules/gastos/gastos.types';
import type { GastosRepository } from '@/modules/gastos/services/gastos.repository';

import type { MovimientoCuenta } from '../cuentas.types';
import type { MovimientosCuentaRepository } from '../services/cuentas.repository';
import { retirar, sincronizarRetiroDeGasto, type DatosRetiro } from '../services/retiro-con-gasto';

/** Repositorios en memoria: los casos de uso dependen de las INTERFACES. */
function reposEnMemoria() {
  const gastosGuardados: Gasto[] = [];
  const movimientos: MovimientoCuenta[] = [];

  const gastos: GastosRepository = {
    async registrar(gasto) {
      const nuevo = { ...gasto, id: gastosGuardados.length + 1, creadoEn: 'ahora' };
      gastosGuardados.push(nuevo);
      return nuevo;
    },
    async obtener(id) {
      return gastosGuardados.find((g) => g.id === id) ?? null;
    },
    async actualizar(id, cambios) {
      const indice = gastosGuardados.findIndex((g) => g.id === id);
      gastosGuardados[indice] = { ...gastosGuardados[indice], ...cambios };
    },
    async eliminar(id) {
      gastosGuardados.splice(
        gastosGuardados.findIndex((g) => g.id === id),
        1,
      );
    },
    async listarEntre() {
      return gastosGuardados;
    },
    async buscarIgualDesde() {
      return null;
    },
    async totalesPorCuenta() {
      return [];
    },
    async listarHijos(padreId) {
      return gastosGuardados.filter((g) => g.gastoPadreId === padreId);
    },
    async isdSinDevolver() {
      return [];
    },
  };

  const movimientosCuenta: MovimientosCuentaRepository = {
    async registrar(movimiento) {
      const nuevo = { ...movimiento, id: movimientos.length + 1, creadoEn: 'ahora' };
      movimientos.push(nuevo);
      return nuevo;
    },
    async obtener(id) {
      return movimientos.find((m) => m.id === id) ?? null;
    },
    async actualizar(id, cambios) {
      const indice = movimientos.findIndex((m) => m.id === id);
      movimientos[indice] = { ...movimientos[indice], ...cambios };
    },
    async eliminar(id) {
      movimientos.splice(
        movimientos.findIndex((m) => m.id === id),
        1,
      );
    },
    async listarTodos() {
      return movimientos;
    },
    async establecerSaldoInicial() {},
    async buscarPorGasto(gastoId) {
      return movimientos.find((m) => m.gastoId === gastoId) ?? null;
    },
  };

  return { gastos, movimientosCuenta, gastosGuardados, movimientos };
}

const UBER: DatosRetiro = {
  cuentaId: 2,
  montoCentavos: 2_000,
  fecha: '2026-11-20',
  gasto: { categoria: 'transporte', metodoPago: 'transferencia', descripcion: 'Uber al trabajo' },
  nota: 'Transporte · Uber al trabajo',
  haciaCuentaId: 1,
};

describe('retiro que crea el gasto', () => {
  it('registra el retiro y el gasto enlazados, por el mismo importe y día', async () => {
    const repos = reposEnMemoria();
    const { retiro, gasto } = await retirar(repos, UBER);

    expect(gasto).toMatchObject({
      montoCentavos: 2_000,
      categoria: 'transporte',
      nota: 'Uber al trabajo',
      fecha: '2026-11-20',
    });
    expect(retiro).toMatchObject({
      tipo: 'retiro',
      cuentaId: 2,
      montoCentavos: 2_000,
      gastoId: gasto?.id,
      nota: 'Transporte · Uber al trabajo',
    });
  });

  it('el gasto no descuenta de ninguna cuenta: la plata ya salió con el retiro', async () => {
    const repos = reposEnMemoria();
    const { retiro, gasto } = await retirar(repos, UBER);

    expect(gasto?.cuentaId).toBeNull();
    // Ni pasa por la otra cuenta: iría y volvería.
    expect(retiro.contraparteId).toBeNull();
  });

  it('sin gasto es sólo una salida, o una transferencia a otra cuenta', async () => {
    const repos = reposEnMemoria();
    const { retiro, gasto } = await retirar(repos, { ...UBER, gasto: null, nota: null });

    expect(gasto).toBeNull();
    expect(repos.gastosGuardados).toHaveLength(0);
    expect(retiro).toMatchObject({ gastoId: null, contraparteId: 1 });
  });

  it('no acepta importes en cero ni con decimales de centavo', async () => {
    const repos = reposEnMemoria();
    await expect(retirar(repos, { ...UBER, montoCentavos: 0 })).rejects.toThrow();
    await expect(retirar(repos, { ...UBER, montoCentavos: 10.5 })).rejects.toThrow();
    expect(repos.movimientos).toHaveLength(0);
  });

  it('corregir el gasto corrige su retiro', async () => {
    const repos = reposEnMemoria();
    const { gasto } = await retirar(repos, UBER);

    await sincronizarRetiroDeGasto(repos.movimientosCuenta, gasto!.id, {
      montoCentavos: 3_500,
      fecha: '2026-11-19',
    });

    expect(repos.movimientos[0]).toMatchObject({
      montoCentavos: 3_500,
      fecha: '2026-11-19',
      nota: 'Transporte · Uber al trabajo',
    });
  });

  it('eliminar el gasto elimina su retiro, y no toca los demás', async () => {
    const repos = reposEnMemoria();
    const { gasto } = await retirar(repos, UBER);
    await retirar(repos, { ...UBER, gasto: null, nota: 'Cajero' });

    await sincronizarRetiroDeGasto(repos.movimientosCuenta, gasto!.id, null);
    expect(repos.movimientos.map((m) => m.nota)).toEqual(['Cajero']);

    // Un gasto cualquiera, sin retiro: no pasa nada.
    await sincronizarRetiroDeGasto(repos.movimientosCuenta, 999, null);
    expect(repos.movimientos).toHaveLength(1);
  });
});
