import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';

import type {
  CambiosMovimientoCuenta,
  Cuenta,
  DatosCuenta,
  MovimientoCuenta,
  NuevoMovimientoCuenta,
  TasaCuenta,
} from '../cuentas.types';

/** Las cuentas y su tasa de interés. */
export interface CuentasRepository {
  /** En el orden elegido. */
  listar(): Promise<Cuenta[]>;
  /** Se agrega al final de la lista. */
  crear(datos: DatosCuenta): Promise<Cuenta>;
  actualizar(id: number, datos: DatosCuenta): Promise<void>;
  /** Cuántos movimientos, gastos e ingresos cuelgan de la cuenta. */
  contarRegistros(id: number): Promise<number>;
  /** Sólo una cuenta sin registros: nunca queda un movimiento sin su cuenta. */
  eliminar(id: number): Promise<void>;
  /** El historial de tasas de TODAS las cuentas. */
  listarTasas(): Promise<TasaCuenta[]>;
  /** Fija la tasa desde un día. Si ya había una para ese día, la reemplaza. */
  establecerTasa(cuentaId: number, desde: FechaIso, tasaBp: number): Promise<void>;
}

/** Lo que entra y sale de una cuenta sin ser un gasto ni un ingreso. */
export interface MovimientosCuentaRepository {
  registrar(movimiento: NuevoMovimientoCuenta): Promise<MovimientoCuenta>;
  obtener(id: number): Promise<MovimientoCuenta | null>;
  actualizar(id: number, cambios: CambiosMovimientoCuenta): Promise<void>;
  eliminar(id: number): Promise<void>;
  /**
   * Todos, del más reciente al más antiguo. Son pocos (un par al mes), así
   * que traerlos todos es más simple que paginar.
   */
  listarTodos(): Promise<MovimientoCuenta[]>;
  /** Reemplaza el saldo inicial de la cuenta: sólo puede haber uno. */
  establecerSaldoInicial(cuentaId: number, montoCentavos: Centavos, fecha: FechaIso): Promise<void>;
  /** El retiro que se registró junto con un gasto, si lo hay. */
  buscarPorGasto(gastoId: number): Promise<MovimientoCuenta | null>;
}
