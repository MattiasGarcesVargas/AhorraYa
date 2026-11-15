import { useMemo } from 'react';

import { hoyIso } from '@/lib/fechas';
import type { Periodo, TipoPeriodo } from '@/lib/periodos';
import { useMovimientosAhorro } from '@/modules/ahorro/hooks/use-ahorro';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import { useGastosEntre } from '@/modules/gastos/hooks/use-gastos';
import { useIngresosEntre } from '@/modules/ingresos/hooks/use-ingresos';
import { usePlan } from '@/modules/plan/hooks/use-plan';
import { COBROS_POR_MES_INICIAL } from '@/modules/plan/plan.types';
import { periodosDeCobroHaciaAtras, tipoPeriodoDeCobro } from '@/modules/plan/utils/frecuencia';

import { calcularResumen, type Resumen } from '../utils/calcular-resumen';
import { historialQuincenas, type FilaQuincena } from '../utils/historial-quincenas';

/**
 * El dashboard COMPONE los datos de los otros módulos; no tiene tablas
 * propias. Cada módulo sigue siendo dueño de sus datos y de cómo se leen.
 */
export function useResumen(periodo: Periodo): { resumen?: Resumen; cargando: boolean } {
  const gastos = useGastosEntre(periodo.inicio, periodo.fin);
  const ingresos = useIngresosEntre(periodo.inicio, periodo.fin);
  const ahorro = useMovimientosAhorro();
  const { categorias } = useCategorias();
  const plan = usePlan();

  const resumen = useMemo(() => {
    if (!gastos.data || !ingresos.data || !ahorro.data || !categorias || !plan.data)
      return undefined;
    return calcularResumen({
      periodo,
      hoy: hoyIso(),
      gastos: gastos.data,
      ingresos: ingresos.data,
      movimientosAhorro: ahorro.data,
      categorias,
      plan: plan.data,
    });
  }, [periodo, gastos.data, ingresos.data, ahorro.data, categorias, plan.data]);

  return { resumen, cargando: resumen === undefined };
}

/**
 * El historial de periodos de cobro: quincenas, o meses si se cobra una vez
 * al mes. `tipo` dice cuál de los dos, para titular la sección.
 */
export function useHistorialQuincenas(cantidad = 6): {
  filas?: FilaQuincena[];
  tipo: TipoPeriodo;
} {
  const hoy = hoyIso();
  const plan = usePlan();
  const cobrosPorMes = plan.data?.cobrosPorMes ?? COBROS_POR_MES_INICIAL;
  const quincenas = useMemo(
    () => periodosDeCobroHaciaAtras(cobrosPorMes, hoy, cantidad),
    [cobrosPorMes, hoy, cantidad],
  );
  const desde = quincenas[quincenas.length - 1].inicio;
  const hasta = quincenas[0].fin;

  const gastos = useGastosEntre(desde, hasta);
  const ingresos = useIngresosEntre(desde, hasta);
  const ahorro = useMovimientosAhorro();
  const { categorias } = useCategorias();

  const filas = useMemo(() => {
    if (!gastos.data || !ingresos.data || !ahorro.data || !categorias || !plan.data)
      return undefined;
    return historialQuincenas({
      quincenas,
      hoy,
      gastos: gastos.data,
      ingresos: ingresos.data,
      movimientosAhorro: ahorro.data,
      categorias,
      plan: plan.data,
    });
  }, [quincenas, hoy, gastos.data, ingresos.data, ahorro.data, categorias, plan.data]);

  return { filas, tipo: tipoPeriodoDeCobro(cobrosPorMes) };
}
