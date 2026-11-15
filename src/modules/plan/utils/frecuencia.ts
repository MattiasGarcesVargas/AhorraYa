import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import {
  desplazarPeriodo,
  periodoQueContiene,
  quincenasHastaAtras,
  type Periodo,
  type TipoPeriodo,
} from '@/lib/periodos';

import type { CambiosPlan, CobrosPorMes, Plan } from '../plan.types';

export const FRECUENCIAS: Record<CobrosPorMes, { nombre: string; detalle: string }> = {
  2: { nombre: 'Quincenal', detalle: 'Cobras el 15 y el último día del mes.' },
  1: { nombre: 'Mensual', detalle: 'Cobras una sola vez al mes.' },
};

export const OPCIONES_FRECUENCIA: readonly CobrosPorMes[] = [2, 1];

/** El periodo que va de un cobro al siguiente: ahí se mide el "págate primero". */
export function tipoPeriodoDeCobro(cobrosPorMes: CobrosPorMes): TipoPeriodo {
  return cobrosPorMes === 1 ? 'mes' : 'quincena';
}

/** Los periodos de cobro hacia atrás, del más reciente al más antiguo. */
export function periodosDeCobroHaciaAtras(
  cobrosPorMes: CobrosPorMes,
  desde: FechaIso,
  cantidad: number,
): Periodo[] {
  if (cobrosPorMes === 2) return quincenasHastaAtras(desde, cantidad);
  const resultado: Periodo[] = [];
  let actual = periodoQueContiene('mes', desde);
  for (let i = 0; i < cantidad; i++) {
    resultado.push(actual);
    actual = desplazarPeriodo(actual, -1);
  }
  return resultado;
}

/** El aporte por cobro que llega justo a la meta: meta ÷ cobros, sin pasarse. */
export function aporteSugerido(metaMensual: Centavos, cobrosPorMes: CobrosPorMes): Centavos {
  return Math.floor(metaMensual / cobrosPorMes);
}

/**
 * Lo que hay que guardar para cambiar de frecuencia sin descuadrar el plan:
 * el aporte pasa a meta ÷ cobros y lo que se cobra en cada pago se ajusta para
 * que el ingreso del mes siga siendo el mismo.
 */
export function cambiosAlCambiarFrecuencia(plan: Plan, cobrosPorMes: CobrosPorMes): CambiosPlan {
  if (cobrosPorMes === plan.cobrosPorMes) return {};
  return {
    cobrosPorMes,
    aporteQuincenalCentavos: aporteSugerido(plan.metaMensualCentavos, cobrosPorMes),
    sueldoQuincenalCentavos: Math.ceil(
      (plan.sueldoQuincenalCentavos * plan.cobrosPorMes) / cobrosPorMes,
    ),
  };
}
