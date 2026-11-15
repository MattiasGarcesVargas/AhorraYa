import { bancoPorId } from '@/constants/bancos.constants';
import type { NombreIcono } from '@/constants/categorias.constants';

import type { Cuenta, TipoCuenta } from '../cuentas.types';
import { formatTasa } from './interes';

export const TIPOS_CUENTA: Record<
  TipoCuenta,
  { nombre: string; descripcion: string; icono: NombreIcono }
> = {
  diaria: {
    nombre: 'Día a día',
    descripcion: 'La que usas para gastar: ahí llega tu plata y de ahí sale tu tarjeta.',
    icono: 'card-outline',
  },
  flexible: {
    nombre: 'Flexible',
    descripcion: 'Tu ahorro. Paga interés todos los días sobre lo que tengas.',
    icono: 'trending-up-outline',
  },
  efectivo: {
    nombre: 'Efectivo',
    descripcion: 'Tu billetera: la plata en efectivo que llevas. Baja sola al pagar en efectivo.',
    icono: 'cash-outline',
  },
};

/** `Pichincha · Flexible · 5% anual` */
export function subtituloCuenta(cuenta: Cuenta, tasaBp = 0): string {
  if (cuenta.tipo === 'efectivo') return 'Efectivo · lo que llevas encima';
  return [
    bancoPorId(cuenta.banco).corto,
    TIPOS_CUENTA[cuenta.tipo].nombre,
    tasaBp > 0 ? `${formatTasa(tasaBp)} anual` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
