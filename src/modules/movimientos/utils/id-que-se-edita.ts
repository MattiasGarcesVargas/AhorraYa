import type { Movimiento } from '../movimientos.types';

/**
 * El id que se abre al tocar un movimiento. Un impuesto (IVA, ISD) de un
 * consumo del exterior se calcula a partir de él: se abre el consumo.
 */
export function idQueSeEdita(movimiento: Pick<Movimiento, 'tipo' | 'id' | 'gastoPadreId'>): number {
  return movimiento.tipo === 'gasto' && movimiento.gastoPadreId
    ? movimiento.gastoPadreId
    : movimiento.id;
}
