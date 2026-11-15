import type { NombreIcono } from '@/constants/categorias.constants';
import type { NombreToken } from '@/constants/tema.constants';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';

/** `ahorro` son los movimientos de cuenta: aportes, retiros, saldo inicial y ajustes. */
export type TipoMovimiento = 'gasto' | 'ingreso' | 'ahorro';

/**
 * Vista unificada de "algo que pasó con mi dinero". Cada módulo sigue
 * guardando lo suyo; esto sólo existe para listarlo todo junto.
 */
export interface Movimiento {
  /** Única entre tipos: `gasto-12`, `ingreso-12`. */
  clave: string;
  tipo: TipoMovimiento;
  id: number;
  fecha: FechaIso;
  creadoEn: string;
  titulo: string;
  detalle: string;
  icono: NombreIcono;
  color: NombreToken;
  /** Con signo según lo que significa para mi bolsillo. */
  importe: Centavos;
  tono: 'normal' | 'positivo';
  /** Si es un impuesto (IVA, ISD) de un consumo del exterior, ese consumo. Se edita él, no el impuesto. */
  gastoPadreId?: number;
  /** Lo que además se borra si se elimina este movimiento (un retiro y su gasto van juntos). */
  avisoEliminar?: string;
}

export type FiltroMovimientos = 'todos' | TipoMovimiento;

export interface GrupoDia {
  fecha: FechaIso;
  titulo: string;
  /** Lo gastado ese día (sólo gastos), para leer el día de un vistazo. */
  gastadoDelDia: Centavos;
  data: Movimiento[];
}
