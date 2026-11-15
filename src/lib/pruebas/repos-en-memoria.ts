import type { Categoria } from '@/modules/categorias/categorias.types';
import { CATEGORIAS_DE_PARTIDA } from '@/modules/categorias/utils/catalogo';
import type { MovimientoCuenta } from '@/modules/cuentas/cuentas.types';
import type { MovimientosCuentaRepository } from '@/modules/cuentas/services/cuentas.repository';
import type { Gasto } from '@/modules/gastos/gastos.types';
import type { GastosRepository } from '@/modules/gastos/services/gastos.repository';
import type { Ingreso } from '@/modules/ingresos/ingresos.types';
import type { IngresosRepository } from '@/modules/ingresos/services/ingresos.repository';

/** Una categoría de app del exterior, para probar los impuestos. */
export const UBER: Categoria = {
  id: 'uber',
  nombre: 'Uber',
  icono: 'car-outline',
  color: 'cat-7',
  orden: 6,
  limiteMensualCentavos: 0,
  delExterior: true,
};

/**
 * Repositorios en memoria para los tests de casos de uso: dependen de las
 * INTERFACES, así que se prueban sin SQLite ni React Native. Sólo para tests.
 */
export function reposEnMemoria(listaCategorias: readonly Categoria[] = [...CATEGORIAS_DE_PARTIDA, UBER]) {
  const gastosGuardados: Gasto[] = [];
  const ingresosGuardados: Ingreso[] = [];
  const movimientos: MovimientoCuenta[] = [];
  let siguienteId = 1;

  const quitar = <T extends { id: number }>(lista: T[], id: number) => {
    const indice = lista.findIndex((item) => item.id === id);
    if (indice >= 0) lista.splice(indice, 1);
  };
  const cambiar = <T extends { id: number }>(lista: T[], id: number, cambios: Partial<T>) => {
    const indice = lista.findIndex((item) => item.id === id);
    if (indice >= 0) lista[indice] = { ...lista[indice], ...cambios };
  };

  const gastos: GastosRepository = {
    async registrar(gasto) {
      const nuevo: Gasto = { ...gasto, id: siguienteId++, creadoEn: 'ahora' };
      gastosGuardados.push(nuevo);
      return nuevo;
    },
    obtener: async (id) => gastosGuardados.find((g) => g.id === id) ?? null,
    actualizar: async (id, cambios) => cambiar(gastosGuardados, id, cambios),
    eliminar: async (id) => quitar(gastosGuardados, id),
    listarHijos: async (padreId) => gastosGuardados.filter((g) => g.gastoPadreId === padreId),
    isdSinDevolver: async (antesDe) =>
      gastosGuardados.filter(
        (g) =>
          g.impuesto === 'isd' &&
          g.fecha < antesDe &&
          !ingresosGuardados.some((ingreso) => ingreso.gastoId === g.id),
      ),
    listarEntre: async (desde, hasta) =>
      gastosGuardados.filter((g) => g.fecha >= desde && g.fecha <= hasta),
    buscarIgualDesde: async () => null,
    totalesPorCuenta: async () => [],
  };

  const ingresos: IngresosRepository = {
    async registrar(ingreso) {
      const nuevo: Ingreso = { ...ingreso, id: siguienteId++, creadoEn: 'ahora' };
      ingresosGuardados.push(nuevo);
      return nuevo;
    },
    obtener: async (id) => ingresosGuardados.find((i) => i.id === id) ?? null,
    actualizar: async (id, cambios) => cambiar(ingresosGuardados, id, cambios),
    eliminar: async (id) => quitar(ingresosGuardados, id),
    buscarPorGasto: async (gastoId) => ingresosGuardados.find((i) => i.gastoId === gastoId) ?? null,
    listarEntre: async (desde, hasta) =>
      ingresosGuardados.filter((i) => i.fecha >= desde && i.fecha <= hasta),
    totalesPorCuenta: async () => [],
    mesadaAcreditadaHasta: async () => null,
    marcarMesadaAcreditada: async () => {},
  };

  const movimientosCuenta = {
    async registrar(movimiento) {
      const nuevo: MovimientoCuenta = { ...movimiento, id: siguienteId++, creadoEn: 'ahora' };
      movimientos.push(nuevo);
      return nuevo;
    },
    obtener: async (id) => movimientos.find((m) => m.id === id) ?? null,
    actualizar: async (id, cambios) => cambiar(movimientos, id, cambios),
    eliminar: async (id) => quitar(movimientos, id),
    listarTodos: async () => movimientos,
    buscarPorGasto: async (gastoId) => movimientos.find((m) => m.gastoId === gastoId) ?? null,
  } as Partial<MovimientosCuentaRepository> as MovimientosCuentaRepository;

  return {
    gastos,
    ingresos,
    movimientosCuenta,
    categorias: { listar: async () => [...listaCategorias] },
    /** Lo guardado, para afirmar sobre ello. */
    guardado: { gastos: gastosGuardados, ingresos: ingresosGuardados, movimientos },
  };
}
