import type { FechaIso } from '@/lib/fechas';

import type { TotalDiarioCuenta } from '@/modules/cuentas/cuentas.types';

import type { CambiosGasto, Gasto, NuevoGasto } from '../gastos.types';

/**
 * Contrato de persistencia de gastos. Las pantallas y hooks dependen de esto,
 * no de SQLite (ver `providers/repositorios-context.ts`).
 */
export interface GastosRepository {
  registrar(gasto: NuevoGasto): Promise<Gasto>;
  obtener(id: number): Promise<Gasto | null>;
  actualizar(id: number, cambios: CambiosGasto): Promise<void>;
  eliminar(id: number): Promise<void>;
  /** Los impuestos (IVA, ISD) que cuelgan de un consumo. */
  listarHijos(padreId: number): Promise<Gasto[]>;
  /**
   * Los ISD con fecha anterior a `antesDe` a los que todavía no se les
   * registró la devolución.
   */
  isdSinDevolver(antesDe: FechaIso): Promise<Gasto[]>;
  /** Gastos entre dos días (ambos incluidos), del más reciente al más antiguo. */
  listarEntre(desde: FechaIso, hasta: FechaIso): Promise<Gasto[]>;
  /**
   * Un gasto idéntico registrado después de `desdeInstante`. Sirve para que un
   * enlace del atajo abierto dos veces no duplique el gasto.
   */
  buscarIgualDesde(gasto: NuevoGasto, desdeInstante: string): Promise<Gasto | null>;
  /**
   * Lo pagado desde cada cuenta, sumado por día, de TODA la historia. Es lo
   * que necesita el saldo de una cuenta sin traer cada gasto.
   */
  totalesPorCuenta(): Promise<TotalDiarioCuenta[]>;
}
