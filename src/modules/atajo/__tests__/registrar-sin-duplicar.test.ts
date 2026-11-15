import type { Gasto, NuevoGasto } from '@/modules/gastos/gastos.types';
import type { GastosRepository } from '@/modules/gastos/services/gastos.repository';

import { registrarSinDuplicar, VENTANA_DUPLICADO_MS } from '../services/registrar-sin-duplicar';

/**
 * Repositorio en memoria: el caso de uso depende de la INTERFAZ, así que se
 * prueba sin SQLite ni React Native.
 */
function repositorioEnMemoria(reloj: { ahora: Date }): GastosRepository & { todos: Gasto[] } {
  const todos: Gasto[] = [];
  return {
    todos,
    async registrar(gasto) {
      const nuevo = { ...gasto, id: todos.length + 1, creadoEn: reloj.ahora.toISOString() };
      todos.push(nuevo);
      return nuevo;
    },
    async obtener(id) {
      return todos.find((g) => g.id === id) ?? null;
    },
    async actualizar(id, cambios) {
      const indice = todos.findIndex((g) => g.id === id);
      todos[indice] = { ...todos[indice], ...cambios };
    },
    async totalesPorCuenta() {
      return [];
    },
    async listarHijos() {
      return [];
    },
    async isdSinDevolver() {
      return [];
    },
    async eliminar(id) {
      todos.splice(
        todos.findIndex((g) => g.id === id),
        1,
      );
    },
    async listarEntre(desde, hasta) {
      return todos.filter((g) => g.fecha >= desde && g.fecha <= hasta);
    },
    async buscarIgualDesde(gasto, desdeInstante) {
      return (
        todos.find(
          (g) =>
            g.montoCentavos === gasto.montoCentavos &&
            g.categoria === gasto.categoria &&
            g.metodoPago === gasto.metodoPago &&
            g.creadoEn >= desdeInstante,
        ) ?? null
      );
    },
  };
}

const CAFE: NuevoGasto = {
  montoCentavos: 150,
  categoria: 'comida',
  metodoPago: 'efectivo',
  cuentaId: null,
  nota: null,
  fecha: '2026-11-20',
  origen: 'atajo',
};

/** Sin categorías del exterior: aquí sólo se prueba que no se duplique. */
const repos = (gastos: GastosRepository) => ({ gastos, categorias: { listar: async () => [] } });

describe('registrarSinDuplicar', () => {
  it('registra un gasto nuevo', async () => {
    const reloj = { ahora: new Date('2026-11-20T15:00:00Z') };
    const repo = repositorioEnMemoria(reloj);

    const resultado = await registrarSinDuplicar(repos(repo), CAFE, reloj.ahora);

    expect(resultado.duplicado).toBe(false);
    expect(repo.todos).toHaveLength(1);
  });

  it('no duplica si el mismo enlace se abre otra vez enseguida', async () => {
    const reloj = { ahora: new Date('2026-11-20T15:00:00Z') };
    const repo = repositorioEnMemoria(reloj);

    await registrarSinDuplicar(repos(repo), CAFE, reloj.ahora);
    reloj.ahora = new Date(reloj.ahora.getTime() + 5_000);
    const segundo = await registrarSinDuplicar(repos(repo), CAFE, reloj.ahora);

    expect(segundo.duplicado).toBe(true);
    expect(repo.todos).toHaveLength(1);
  });

  it('pasada la ventana, el mismo gasto es uno nuevo (otro café)', async () => {
    const reloj = { ahora: new Date('2026-11-20T15:00:00Z') };
    const repo = repositorioEnMemoria(reloj);

    await registrarSinDuplicar(repos(repo), CAFE, reloj.ahora);
    reloj.ahora = new Date(reloj.ahora.getTime() + VENTANA_DUPLICADO_MS + 1_000);
    await registrarSinDuplicar(repos(repo), CAFE, reloj.ahora);

    expect(repo.todos).toHaveLength(2);
  });

  it('rechaza un gasto inválido antes de tocar el repositorio', async () => {
    const reloj = { ahora: new Date() };
    const repo = repositorioEnMemoria(reloj);

    await expect(registrarSinDuplicar(repos(repo), { ...CAFE, montoCentavos: 0 })).rejects.toThrow();
    expect(repo.todos).toHaveLength(0);
  });
});
