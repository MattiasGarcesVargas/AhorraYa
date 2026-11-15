import type { Centavos } from '@/lib/dinero';

/**
 * Qué parte de un ingreso pasa al ahorro apenas llega:
 *  - `nada`: se queda todo para gastar;
 *  - `plan`: el aporte del plan ("págate primero");
 *  - `todo`: va completo al ahorro (cachuelos, bonos, regalos).
 */
export type Reparto = 'nada' | 'plan' | 'todo';

export interface ResultadoReparto {
  alAhorro: Centavos;
  paraGastar: Centavos;
}

/**
 * Reparte un ingreso. Nunca aparta más de lo que entró: si el sueldo llegó
 * incompleto, el aporte del plan se recorta a lo que hay.
 */
export function repartir(
  montoCentavos: Centavos,
  reparto: Reparto,
  aportePlan: Centavos,
): ResultadoReparto {
  const deseado = reparto === 'todo' ? montoCentavos : reparto === 'plan' ? aportePlan : 0;
  const alAhorro = Math.max(0, Math.min(deseado, montoCentavos));
  return { alAhorro, paraGastar: montoCentavos - alAhorro };
}
