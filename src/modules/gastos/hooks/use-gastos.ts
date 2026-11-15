import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import type { FechaIso } from '@/lib/fechas';
import { useRepositorios } from '@/providers/repositorios-context';

import { CLAVE_CUENTAS_RAIZ, CLAVE_INGRESOS_RAIZ } from '@/lib/claves-consulta';

import type { CambiosGasto, NuevoGasto } from '../gastos.types';
import { actualizarGasto, eliminarGasto, registrarGasto } from '../services/registrar-gasto';

/** Raíz de las claves de gastos: invalidarla refresca todo lo que dependa de ellos. */
export const CLAVE_GASTOS = ['gastos'] as const;

export function useGastosEntre(desde: FechaIso, hasta: FechaIso) {
  const { gastos } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_GASTOS, desde, hasta],
    queryFn: () => gastos.listarEntre(desde, hasta),
  });
}

/** Registra un gasto y, si es de una app del exterior con tarjeta, su IVA y su ISD. */
export function useRegistrarGasto() {
  const repos = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nuevo: NuevoGasto) =>
      repos.transaccion(async () => (await registrarGasto(repos, nuevo)).gasto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS }),
  });
}

/** Lo pagado desde cada cuenta, por día. Cuelga de la clave de gastos: registrar uno lo actualiza. */
export function useTotalesGastosPorCuenta() {
  const { gastos } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_GASTOS, 'por-cuenta'],
    queryFn: () => gastos.totalesPorCuenta(),
  });
}

export function useGasto(id: number | undefined) {
  const { gastos } = useRepositorios();
  return useQuery({
    queryKey: [...CLAVE_GASTOS, 'uno', id],
    queryFn: () => gastos.obtener(id as number),
    enabled: id !== undefined,
  });
}

/**
 * Corrige un gasto. Sus impuestos, la devolución del ISD y el retiro del
 * ahorro del que nació (si lo hay) se corrigen con él en la misma operación.
 */
export function useActualizarGasto() {
  const repos = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: CambiosGasto }) =>
      repos.transaccion(() => actualizarGasto(repos, id, cambios)),
    onSuccess: () => invalidarTodo(queryClient),
  });
}

/** Elimina un gasto con todo lo que cuelga de él (impuestos, devolución, retiro). */
export function useEliminarGasto() {
  const repos = useRepositorios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => repos.transaccion(() => eliminarGasto(repos, id)),
    onSuccess: () => invalidarTodo(queryClient),
  });
}

/** Un gasto puede mover cuentas e ingresos (la devolución del ISD): se refresca todo. */
async function invalidarTodo(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: CLAVE_GASTOS });
  await queryClient.invalidateQueries({ queryKey: CLAVE_CUENTAS_RAIZ });
  await queryClient.invalidateQueries({ queryKey: CLAVE_INGRESOS_RAIZ });
}
