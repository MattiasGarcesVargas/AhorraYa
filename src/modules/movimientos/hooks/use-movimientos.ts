import { useMemo } from 'react';
import { useRouter } from 'expo-router';

import { confirmar } from '@/lib/confirmar';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { contieneFecha, type Periodo } from '@/lib/periodos';
import { useCatalogoCategorias } from '@/modules/categorias/hooks/use-categorias';
import {
  useCuentas,
  useEliminarMovimientoCuenta,
  useMovimientosCuenta,
} from '@/modules/cuentas/hooks/use-cuentas';
import { useEliminarGasto, useGastosEntre } from '@/modules/gastos/hooks/use-gastos';
import { useEliminarIngreso, useIngresosEntre } from '@/modules/ingresos/hooks/use-ingresos';

import type { FiltroMovimientos, Movimiento } from '../movimientos.types';
import { idQueSeEdita } from '../utils/id-que-se-edita';
import {
  agruparPorDia,
  desdeGasto,
  desdeIngreso,
  desdeMovimientoCuenta,
  filtrar,
} from '../utils/movimientos.utils';

export function useMovimientos(periodo: Periodo, filtro: FiltroMovimientos) {
  const gastos = useGastosEntre(periodo.inicio, periodo.fin);
  const ingresos = useIngresosEntre(periodo.inicio, periodo.fin);
  const deCuenta = useMovimientosCuenta();
  const cuentas = useCuentas().data;
  const catalogo = useCatalogoCategorias();

  const grupos = useMemo(() => {
    const movimientosCuenta = deCuenta.data ?? [];
    // Los gastos que nacieron de un retiro del ahorro se marcan: van enlazados.
    const delAhorro = new Set(movimientosCuenta.map((m) => m.gastoId));
    const cuentaPorId = new Map((cuentas ?? []).map((cuenta) => [cuenta.id, cuenta]));

    const todos: Movimiento[] = [
      ...(gastos.data ?? []).map((gasto) =>
        desdeGasto(gasto, catalogo, { delAhorro: delAhorro.has(gasto.id) }),
      ),
      ...(ingresos.data ?? []).map(desdeIngreso),
      ...movimientosCuenta
        .filter((m) => contieneFecha(periodo, m.fecha))
        .map((m) => desdeMovimientoCuenta(m, cuentaPorId.get(m.cuentaId), cuentaPorId)),
    ];
    return agruparPorDia(filtrar(todos, filtro));
  }, [gastos.data, ingresos.data, deCuenta.data, cuentas, catalogo, periodo, filtro]);

  return { grupos, cargando: gastos.isPending || ingresos.isPending || deCuenta.isPending };
}

/**
 * Borrar cualquier movimiento, sea del tipo que sea. Cada tipo se borra con
 * el hook de SU módulo: aquí sólo se elige cuál.
 */
export function useEliminarMovimiento() {
  const gasto = useEliminarGasto();
  const ingreso = useEliminarIngreso();
  const ahorro = useEliminarMovimientoCuenta();

  return async (movimiento: Movimiento) => {
    const ok = await confirmar({
      titulo: `¿Eliminar "${movimiento.titulo}"?`,
      mensaje: [
        `${formatMoneda(Math.abs(movimiento.importe))} · Esta acción no se puede deshacer.`,
        movimiento.avisoEliminar,
      ]
        .filter(Boolean)
        .join(' '),
      textoConfirmar: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;

    hapticos.aviso();
    const eliminar = { gasto, ingreso, ahorro }[movimiento.tipo];
    eliminar.mutate(movimiento.id);
  };
}

const RUTA_EDICION = {
  gasto: '/nuevo-gasto',
  ingreso: '/nuevo-ingreso',
  ahorro: '/movimiento-cuenta',
} as const;

/**
 * Abre cualquier movimiento para corregirlo, en la pantalla de SU tipo. Un
 * impuesto (IVA, ISD) abre su consumo: se calcula a partir de él, no se edita.
 */
export function useAbrirMovimiento() {
  const router = useRouter();
  return (movimiento: Pick<Movimiento, 'tipo' | 'id' | 'gastoPadreId'>) =>
    router.push({
      pathname: RUTA_EDICION[movimiento.tipo],
      params: { id: String(idQueSeEdita(movimiento)) },
    });
}
