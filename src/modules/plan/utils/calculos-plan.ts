import type { Centavos } from '@/lib/dinero';
import type { TipoPeriodo } from '@/lib/periodos';
import type { Categoria } from '@/modules/categorias/categorias.types';
import { totalPresupuestoMensual } from '@/modules/categorias/utils/catalogo';

import type { Plan } from '../plan.types';

/** Semanas promedio de un mes: 52 / 12. */
const SEMANAS_POR_MES = 52 / 12;

/**
 * Límite de una categoría para el periodo que se mira. El presupuesto se
 * define por MES; la quincena se queda con la mitad (redondeada al centavo).
 */
export function limiteEnPeriodo(limiteMensual: Centavos, tipo: TipoPeriodo): Centavos {
  return tipo === 'mes' ? limiteMensual : Math.round(limiteMensual / 2);
}

/** Lo que deja la mesada semanal en un mes promedio (~4.3 semanas). */
export function mesadaMensualEstimada(plan: Plan): Centavos {
  return Math.round(plan.mesadaSemanalCentavos * SEMANAS_POR_MES);
}

/** Ingreso esperado al mes según el plan: los cobros del mes y ~4.3 mesadas. */
export function ingresoMensualEstimado(plan: Plan): Centavos {
  return plan.sueldoQuincenalCentavos * plan.cobrosPorMes + mesadaMensualEstimada(plan);
}

/**
 * ¿Cuadra el plan? Ingreso estimado − gastos presupuestados − meta de ahorro.
 * Negativo quiere decir que, gastando lo presupuestado, no se llega a la meta.
 */
export function holguraMensual(plan: Plan, categorias: readonly Categoria[]): Centavos {
  return (
    ingresoMensualEstimado(plan) - totalPresupuestoMensual(categorias) - plan.metaMensualCentavos
  );
}
