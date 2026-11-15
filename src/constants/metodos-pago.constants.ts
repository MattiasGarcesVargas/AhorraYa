import type { NombreIcono } from './categorias.constants';

/** Formas de pago. Igual que las categorías: son datos, no código. */
export const METODOS_PAGO = [
  {
    id: 'efectivo',
    nombre: 'Efectivo',
    icono: 'cash-outline',
    alias: ['cash', 'billete', 'plata'],
  },
  {
    id: 'debito',
    nombre: 'Débito',
    icono: 'card-outline',
    alias: ['tarjeta de debito', 'tarjeta debito', 'tarjeta', 'td'],
  },
  {
    id: 'credito',
    nombre: 'Crédito',
    icono: 'card',
    alias: ['tarjeta de credito', 'tarjeta credito', 'tc'],
  },
  {
    id: 'transferencia',
    nombre: 'Transferencia',
    icono: 'swap-horizontal-outline',
    alias: ['transfer', 'deuna', 'qr', 'app del banco'],
  },
] as const satisfies readonly {
  id: string;
  nombre: string;
  icono: NombreIcono;
  alias: readonly string[];
}[];

export type MetodoPago = (typeof METODOS_PAGO)[number];
export type MetodoPagoId = MetodoPago['id'];

export const IDS_METODOS_PAGO = METODOS_PAGO.map((m) => m.id) as [MetodoPagoId, ...MetodoPagoId[]];

const POR_ID = new Map<string, MetodoPago>(METODOS_PAGO.map((m) => [m.id, m]));

export function metodoPagoPorId(id: string): MetodoPago {
  return POR_ID.get(id) ?? METODOS_PAGO[0];
}
