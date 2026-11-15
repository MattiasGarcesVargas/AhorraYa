import { aFechaIso, ultimoDiaDelMes, type FechaIso } from '@/lib/fechas';

/** El día de cobro dentro de un mes; si el mes es más corto, su último día. */
export function fechaDeCobro(anio: number, mesIndice: number, diaCobro: number): FechaIso {
  const dia = Math.min(diaCobro, ultimoDiaDelMes(anio, mesIndice));
  return aFechaIso(new Date(anio, mesIndice, dia));
}
