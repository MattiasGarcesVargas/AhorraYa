import type { BancoId } from '@/constants/bancos.constants';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';

/**
 * - `diaria`: la cuenta del día a día. Ahí llega la mesada y de ahí sale la
 *   tarjeta de débito.
 * - `flexible`: la cuenta de ahorro. Paga interés todos los días.
 */
export type TipoCuenta = 'diaria' | 'flexible';

export interface Cuenta {
  id: number;
  banco: BancoId;
  nombre: string;
  tipo: TipoCuenta;
  orden: number;
  creadoEn: string;
}

export type DatosCuenta = Pick<Cuenta, 'banco' | 'nombre' | 'tipo'>;

/**
 * Tasa de interés anual de una cuenta DESDE un día. Es un historial: cambiar
 * la tasa agrega una fila y el interés ya ganado con la tasa anterior no se
 * recalcula.
 */
export interface TasaCuenta {
  cuentaId: number;
  desde: FechaIso;
  /** Puntos básicos: 500 = 5,00 % anual. Enteros, como los centavos. */
  tasaBp: number;
}

/**
 * - `inicial`: lo que ya había en la cuenta al empezar a llevarla (uno solo).
 * - `aporte`: entra plata a la cuenta. Con `contraparteId`, sale de esa otra.
 * - `retiro`: sale plata de la cuenta. Con `contraparteId`, entra a esa otra.
 * - `ajuste`: diferencia al cuadrar con el saldo real del banco.
 */
export type TipoMovimientoCuenta = 'inicial' | 'aporte' | 'retiro' | 'ajuste';

/**
 * De dónde salió la plata de un aporte al ahorro: del sueldo (cuenta para el
 * aporte del período de cobro) o un extra (sólo suma a la meta del mes).
 */
export type OrigenAporte = 'sueldo' | 'extra';

export interface MovimientoCuenta {
  id: number;
  cuentaId: number;
  /** La otra cuenta de una transferencia entre cuentas propias. */
  contraparteId: number | null;
  /** El gasto que se registró junto con este retiro ("saqué para el Uber"). */
  gastoId: number | null;
  tipo: TipoMovimientoCuenta;
  /** Positivo; el tipo dice si suma o resta. Sólo el `ajuste` lleva signo. */
  montoCentavos: Centavos;
  nota: string | null;
  fecha: FechaIso;
  creadoEn: string;
  /** Sólo importa en un `aporte`. Sin valor = del sueldo. */
  origen?: OrigenAporte | null;
}

export type NuevoMovimientoCuenta = Omit<MovimientoCuenta, 'id' | 'creadoEn'>;

/** Lo que se puede corregir de un movimiento ya registrado. */
export type CambiosMovimientoCuenta = Pick<
  MovimientoCuenta,
  'montoCentavos' | 'nota' | 'fecha' | 'origen'
>;

/**
 * Lo que entró o salió de una cuenta en un día por gastos o por ingresos. Los
 * repositorios de esos módulos lo entregan ya sumado: para el saldo no hace
 * falta cada gasto, sólo el total del día.
 */
export interface TotalDiarioCuenta {
  cuentaId: number;
  fecha: FechaIso;
  totalCentavos: Centavos;
}
