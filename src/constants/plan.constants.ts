import type { Centavos } from '@/lib/dinero';
import type { Plan } from '@/modules/plan/plan.types';

import { CATEGORIAS_INICIALES } from './categorias.constants';

/**
 * Punto de partida tomado de mi plan (mi_situacion_financiera.md, nov. 2026).
 * Sólo se usa para sembrar la base la primera vez; después cada cifra se
 * cambia desde Ajustes.
 */
export const PLAN_INICIAL = {
  /** Meta: ahorrar $500 al mes. */
  metaMensualCentavos: 50_000,
  /** "Págate primero": $250 en cada cobro, apenas llega. */
  aporteQuincenalCentavos: 25_000,
  /** Sueldo: $350 en cada cobro (el 15 y el último día). */
  sueldoQuincenalCentavos: 35_000,
  /** Mesada para transporte: $30 cada semana. */
  mesadaSemanalCentavos: 3_000,
  /** Cobro quincenal: dos pagos al mes. No es dinero: 1 = mensual, 2 = quincenal. */
  cobrosPorMes: 2,
} as const satisfies Plan;

/**
 * Límite mensual inicial por categoría (por quincena es la mitad). Lo usa la
 * migración 1, que creó la tabla `presupuesto` antes de que las categorías
 * vivieran en la base.
 */
export const PRESUPUESTO_INICIAL: Readonly<Record<string, Centavos>> = Object.fromEntries(
  CATEGORIAS_INICIALES.map((categoria) => [categoria.id, categoria.limiteMensualCentavos]),
);
