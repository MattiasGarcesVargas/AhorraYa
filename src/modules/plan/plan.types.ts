import type { Centavos } from '@/lib/dinero';

/** Cuántas veces cobro al mes: 2 = quincenal (el 15 y el último día), 1 = mensual. */
export type CobrosPorMes = 1 | 2;

export const COBROS_POR_MES_INICIAL: CobrosPorMes = 2;

/**
 * Las cifras de mi plan. Todas editables desde Ajustes.
 *
 * `aporteQuincenalCentavos` y `sueldoQuincenalCentavos` son "por cobro": con
 * cobro mensual valen para el mes entero. Conservan el nombre porque así
 * están guardadas en la base.
 */
export interface Plan {
  metaMensualCentavos: Centavos;
  aporteQuincenalCentavos: Centavos;
  sueldoQuincenalCentavos: Centavos;
  mesadaSemanalCentavos: Centavos;
  cobrosPorMes: CobrosPorMes;
}

/** Los campos de DINERO del plan: los que edita la hoja genérica de importe. */
export type CampoPlan = Exclude<keyof Plan, 'cobrosPorMes'>;

/** Lo que se guarda de una vez. Varios campos juntos entran o no entra ninguno. */
export type CambiosPlan = Partial<Plan>;

interface TextosCampoPlan {
  titulo: string;
  descripcion: (cobrosPorMes: CobrosPorMes) => string;
}

export const CAMPOS_PLAN: Record<CampoPlan, TextosCampoPlan> = {
  metaMensualCentavos: {
    titulo: 'Meta de ahorro mensual',
    descripcion: () => 'Cuánto quieres ahorrar cada mes.',
  },
  aporteQuincenalCentavos: {
    titulo: 'Aporte por cobro',
    descripcion: (cobrosPorMes) =>
      cobrosPorMes === 2
        ? 'Lo que pasas al ahorro apenas cobras, antes de gastar nada. Cobras dos veces al mes: entre los dos aportes no pueden pasar de tu meta.'
        : 'Lo que pasas al ahorro apenas cobras, antes de gastar nada. Cobras una vez al mes: no puede pasar de tu meta.',
  },
  sueldoQuincenalCentavos: {
    titulo: 'Lo que cobras en cada pago',
    descripcion: (cobrosPorMes) =>
      cobrosPorMes === 2
        ? 'Lo que recibes el 15 y el último día del mes, cada vez.'
        : 'Lo que recibes una vez al mes.',
  },
  mesadaSemanalCentavos: {
    titulo: 'Mesada semanal',
    descripcion: () =>
      'Lo que recibes cada semana. Se suma sola a tu cuenta del día a día todos los lunes; con 0 se apaga.',
  },
};

export function esCampoPlan(valor: string): valor is CampoPlan {
  return valor in CAMPOS_PLAN;
}
