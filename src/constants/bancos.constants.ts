import type { NombreToken } from './tema.constants';

/**
 * Bancos en los que se puede tener una cuenta. Igual que las formas de pago:
 * son datos, no código. Agregar un banco es agregar una fila aquí.
 */
export const BANCOS = [
  { id: 'pichincha', nombre: 'Banco Pichincha', corto: 'Pichincha', color: 'cat-1' },
  { id: 'guayaquil', nombre: 'Banco Guayaquil', corto: 'Guayaquil', color: 'cat-3' },
  { id: 'pacifico', nombre: 'Banco del Pacífico', corto: 'Pacífico', color: 'cat-5' },
  // No es un banco: es donde "vive" la billetera, la plata en efectivo.
  { id: 'efectivo', nombre: 'Efectivo', corto: 'En mano', color: 'cat-2' },
] as const satisfies readonly { id: string; nombre: string; corto: string; color: NombreToken }[];

export type Banco = (typeof BANCOS)[number];
export type BancoId = Banco['id'];

const POR_ID = new Map<string, Banco>(BANCOS.map((banco) => [banco.id, banco]));

/** Nunca falla: un banco desconocido se muestra como el primero de la lista. */
export function bancoPorId(id: string): Banco {
  return POR_ID.get(id) ?? BANCOS[0];
}

/** El "banco" de la billetera. No se ofrece al elegir banco de una cuenta. */
export const BANCO_EFECTIVO: BancoId = 'efectivo';

/** Los bancos de verdad, para el formulario de cuenta. */
export const BANCOS_REALES = BANCOS.filter((banco) => banco.id !== BANCO_EFECTIVO);

export function esBancoId(valor: unknown): valor is BancoId {
  return typeof valor === 'string' && POR_ID.has(valor);
}
