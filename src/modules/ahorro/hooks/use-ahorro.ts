import { useMemo } from 'react';

import { hoyIso } from '@/lib/fechas';
import {
  useCuentaPrincipal,
  useCuentas,
  useMovimientosCuenta,
  useRegistrarMovimientoCuenta,
} from '@/modules/cuentas/hooks/use-cuentas';
import type { MovimientoCuenta } from '@/modules/cuentas/cuentas.types';

import { movimientosDeLaMeta } from '../utils/calculos-ahorro';

/**
 * Los movimientos de las cuentas de AHORRO (las flexibles): de ahí sale la
 * meta del mes y el "págate primero". Las cuentas del día a día no cuentan
 * como ahorro, ni los pases entre dos cuentas de ahorro.
 */
export function useMovimientosAhorro(): { data?: MovimientoCuenta[]; isPending: boolean } {
  const cuentas = useCuentas().data;
  const movimientos = useMovimientosCuenta().data;

  const data = useMemo(() => {
    if (!cuentas || !movimientos) return undefined;
    const deAhorro = new Set(cuentas.filter((c) => c.tipo === 'flexible').map((c) => c.id));
    return movimientosDeLaMeta(movimientos, deAhorro);
  }, [cuentas, movimientos]);

  return { data, isPending: data === undefined };
}

/**
 * "Ya aparté": un aporte a la cuenta de ahorro principal que sale de la
 * cuenta del día a día, que es donde llega el sueldo.
 */
export function useAportarAlAhorro() {
  const ahorro = useCuentaPrincipal('flexible');
  const diaria = useCuentaPrincipal('diaria');
  const registrar = useRegistrarMovimientoCuenta();

  return {
    /** Sin cuenta flexible no hay a dónde aportar. */
    disponible: ahorro !== undefined,
    cargando: registrar.isPending,
    aportar: (montoCentavos: number, nota: string, alTerminar?: () => void) => {
      if (!ahorro) return;
      registrar.mutate(
        {
          cuentaId: ahorro.id,
          contraparteId: diaria?.id ?? null,
          gastoId: null,
          tipo: 'aporte',
          montoCentavos,
          nota,
          fecha: hoyIso(),
          origen: 'sueldo',
        },
        { onSuccess: alTerminar },
      );
    },
  };
}
