import { formatMonedaEntera } from '@/lib/format';

import type { CambiosPlan, Plan } from '../plan.types';
import { ingresoMensualEstimado } from './calculos-plan';
import { aporteSugerido } from './frecuencia';

export type ResultadoValidacionPlan =
  { ok: true } | { ok: false; motivo: string; sugerencia: string };

interface ReglaPlan {
  /** Los campos que la regla mira: sólo se exige al guardar si alguno cambió. */
  campos: readonly (keyof Plan)[];
  revisar(plan: Plan): ResultadoValidacionPlan;
}

const VALIDO: ResultadoValidacionPlan = { ok: true };

/** Los aportes del mes no pueden pasar de la meta: aporte × cobros ≤ meta. */
const APORTES_DENTRO_DE_LA_META: ReglaPlan = {
  campos: ['aporteQuincenalCentavos', 'metaMensualCentavos', 'cobrosPorMes'],
  revisar(plan) {
    const aporte = plan.aporteQuincenalCentavos;
    const meta = plan.metaMensualCentavos;
    const total = aporte * plan.cobrosPorMes;
    if (total <= meta) return VALIDO;

    const sugerido = formatMonedaEntera(aporteSugerido(meta, plan.cobrosPorMes));
    return {
      ok: false,
      motivo:
        plan.cobrosPorMes === 1
          ? `Tu aporte por cobro es ${formatMonedaEntera(aporte)} y tu meta es ${formatMonedaEntera(meta)}.`
          : `Con ${plan.cobrosPorMes} cobros de ${formatMonedaEntera(aporte)} serían ${formatMonedaEntera(total)} y tu meta es ${formatMonedaEntera(meta)}.`,
      sugerencia: `Baja el aporte por cobro a ${sugerido} o sube la meta a ${formatMonedaEntera(total)}.`,
    };
  },
};

/** No se puede ahorrar más de lo que entra: meta ≤ sueldo × cobros + mesada del mes. */
const META_DENTRO_DEL_INGRESO: ReglaPlan = {
  campos: [
    'metaMensualCentavos',
    'sueldoQuincenalCentavos',
    'mesadaSemanalCentavos',
    'cobrosPorMes',
  ],
  revisar(plan) {
    const meta = plan.metaMensualCentavos;
    const ingreso = ingresoMensualEstimado(plan);
    if (meta <= ingreso) return VALIDO;
    return {
      ok: false,
      motivo: `Tu meta es ${formatMonedaEntera(meta)} y al mes te entran unos ${formatMonedaEntera(ingreso)}.`,
      sugerencia: `Baja la meta a ${formatMonedaEntera(ingreso)} o menos, o corrige lo que cobras.`,
    };
  },
};

const REGLAS: readonly ReglaPlan[] = [APORTES_DENTRO_DE_LA_META, META_DENTRO_DEL_INGRESO];

function primeraFalla(plan: Plan, reglas: readonly ReglaPlan[]): ResultadoValidacionPlan {
  for (const regla of reglas) {
    const resultado = regla.revisar(plan);
    if (!resultado.ok) return resultado;
  }
  return VALIDO;
}

/** ¿Las cifras del plan son coherentes entre sí? Si no, dice por qué, con los números. */
export function validarPlan(plan: Plan): ResultadoValidacionPlan {
  return primeraFalla(plan, REGLAS);
}

export function aplicarCambiosPlan(plan: Plan, cambios: CambiosPlan): Plan {
  return { ...plan, ...cambios };
}

/**
 * Valida el plan que QUEDARÍA tras un cambio. Sólo se exigen las reglas que
 * tocan algún campo cambiado: partiendo de un plan válido es lo mismo que
 * validarlo entero, y si el plan guardado ya venía descuadrado deja corregirlo
 * de a un campo sin quedar atrapado por una regla ajena al cambio.
 */
export function validarCambiosPlan(plan: Plan, cambios: CambiosPlan): ResultadoValidacionPlan {
  const cambiados = new Set(Object.keys(cambios));
  return primeraFalla(
    aplicarCambiosPlan(plan, cambios),
    REGLAS.filter((regla) => regla.campos.some((campo) => cambiados.has(campo))),
  );
}
