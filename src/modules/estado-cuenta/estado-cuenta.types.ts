import type { ColorCategoria } from '@/constants/categorias.constants';
import type { Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import type { Periodo } from '@/lib/periodos';

export type TipoLineaCuenta = 'gasto' | 'ingreso' | 'aporte' | 'retiro';

/** Una línea del "extracto": todo lo que entró o salió de mi bolsillo. */
export interface LineaCuenta {
  fecha: FechaIso;
  tipo: TipoLineaCuenta;
  concepto: string;
  categoria: string | null;
  metodo: string | null;
  /** Con signo: lo que entra suma, lo que sale (gastos y aportes al ahorro) resta. */
  monto: Centavos;
}

export interface LineaAhorro {
  fecha: FechaIso;
  concepto: string;
  /** Con signo: aportes suman, retiros restan. */
  monto: Centavos;
  /** Saldo de la cuenta de ahorro después de este movimiento. */
  saldo: Centavos;
}

export interface FilaCategoriaEstado {
  nombre: string;
  color: ColorCategoria;
  gastado: Centavos;
  limite: Centavos;
  /** Límite − gastado. Negativo si me pasé. */
  diferencia: Centavos;
  porcentaje: number;
  excedido: boolean;
  sinTope: boolean;
}

export interface FilaMetodoEstado {
  nombre: string;
  cantidad: number;
  total: Centavos;
}

/**
 * Todo lo que va en el estado de cuenta de un mes, ya calculado. Quien lo
 * pinta (PDF o CSV) no hace cuentas: sólo da formato.
 */
export interface EstadoCuenta {
  periodo: Periodo;
  /** `Noviembre 2026` */
  titulo: string;
  /** `Del 1 al 30 de noviembre de 2026` */
  rango: string;
  /** `8 de noviembre de 2026` */
  generadoEl: string;
  /** El mes aún no termina: las cifras son parciales. */
  enCurso: boolean;
  totales: {
    ingresos: Centavos;
    gastos: Centavos;
    aportes: Centavos;
    retiros: Centavos;
    ahorroNeto: Centavos;
    /** Ingresos − gastos − aportes + retiros: lo que quedó libre en el mes. */
    flujoLibre: Centavos;
  };
  meta: {
    objetivo: Centavos;
    alcanzado: Centavos;
    porcentaje: number;
    cumplida: boolean;
  };
  ahorro: {
    saldoAlInicio: Centavos;
    saldoAlCierre: Centavos;
    lineas: LineaAhorro[];
  };
  categorias: FilaCategoriaEstado[];
  metodos: FilaMetodoEstado[];
  movimientos: LineaCuenta[];
  cantidadGastos: number;
  promedioDiario: Centavos;
}
