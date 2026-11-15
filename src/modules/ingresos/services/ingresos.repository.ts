import type { FechaIso } from '@/lib/fechas';

import type { TotalDiarioCuenta } from '@/modules/cuentas/cuentas.types';

import type { Ingreso, NuevoIngreso } from '../ingresos.types';

export interface IngresosRepository {
  registrar(ingreso: NuevoIngreso): Promise<Ingreso>;
  obtener(id: number): Promise<Ingreso | null>;
  actualizar(id: number, cambios: NuevoIngreso): Promise<void>;
  eliminar(id: number): Promise<void>;
  /** La devolución registrada para un gasto de ISD, si ya existe. */
  buscarPorGasto(gastoId: number): Promise<Ingreso | null>;
  listarEntre(desde: FechaIso, hasta: FechaIso): Promise<Ingreso[]>;
  /** Lo recibido en cada cuenta, sumado por día, de toda la historia. */
  totalesPorCuenta(): Promise<TotalDiarioCuenta[]>;
  /** Hasta qué día ya se acreditó la mesada automática (`null` si nunca). */
  mesadaAcreditadaHasta(): Promise<FechaIso | null>;
  marcarMesadaAcreditada(hasta: FechaIso): Promise<void>;
}
