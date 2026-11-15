import type { NombreIcono } from '@/constants/categorias.constants';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';

export const TIPOS_INGRESO = [
  { id: 'sueldo', nombre: 'Sueldo', icono: 'briefcase-outline' },
  { id: 'mesada', nombre: 'Mesada', icono: 'people-outline' },
  { id: 'extra', nombre: 'Extra', icono: 'sparkles-outline' },
  { id: 'reembolso', nombre: 'Reembolso', icono: 'return-down-back-outline' },
] as const satisfies readonly { id: string; nombre: string; icono: NombreIcono }[];

export type TipoIngreso = (typeof TIPOS_INGRESO)[number]['id'];

export function tipoIngresoPorId(id: string) {
  return TIPOS_INGRESO.find((tipo) => tipo.id === id) ?? TIPOS_INGRESO[2];
}

export interface Ingreso {
  id: number;
  montoCentavos: Centavos;
  tipo: TipoIngreso;
  /** La cuenta a la que llegó. `null` si no entró a ninguna (efectivo, historia). */
  cuentaId: number | null;
  nota: string | null;
  fecha: FechaIso;
  creadoEn: string;
  /** Si es la devolución de un ISD, el gasto de ISD que cancela. */
  gastoId?: number | null;
}

export type NuevoIngreso = Omit<Ingreso, 'id' | 'creadoEn'>;
