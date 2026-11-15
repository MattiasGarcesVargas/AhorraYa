import type { OpcionesConfirmacion } from './confirmar';

export type { OpcionesConfirmacion } from './confirmar';

export function confirmar({ titulo, mensaje }: OpcionesConfirmacion): Promise<boolean> {
  return Promise.resolve(window.confirm(mensaje ? `${titulo}\n\n${mensaje}` : titulo));
}
