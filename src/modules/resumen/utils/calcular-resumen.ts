import { porcentaje, sumar, type Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import { contieneFecha, diasRestantes, type Periodo } from '@/lib/periodos';
import type { MovimientoAhorro } from '@/modules/ahorro/ahorro.types';
import {
  ahorroNetoEn,
  aportesDeSueldoEn,
  aportesExtraEn,
} from '@/modules/ahorro/utils/calculos-ahorro';
import type { Categoria } from '@/modules/categorias/categorias.types';
import { SIN_CATEGORIA } from '@/modules/categorias/utils/catalogo';
import type { Gasto } from '@/modules/gastos/gastos.types';
import { cuentaEnPresupuesto } from '@/modules/gastos/utils/impuestos-exterior';
import type { Ingreso } from '@/modules/ingresos/ingresos.types';
import { esDevolucionIsd } from '@/modules/ingresos/utils/devolucion';
import type { Plan } from '@/modules/plan/plan.types';
import { limiteEnPeriodo } from '@/modules/plan/utils/calculos-plan';
import { tipoPeriodoDeCobro } from '@/modules/plan/utils/frecuencia';

export interface EntradaResumen {
  periodo: Periodo;
  hoy: FechaIso;
  gastos: readonly Gasto[];
  ingresos: readonly Ingreso[];
  movimientosAhorro: readonly MovimientoAhorro[];
  /** Las categorías con su límite mensual. */
  categorias: readonly Categoria[];
  plan: Plan;
}

export interface ResumenCategoria {
  categoria: Categoria;
  gastado: Centavos;
  limite: Centavos;
  /** Negativo cuando me pasé. */
  restante: Centavos;
  porcentaje: number;
  excedido: boolean;
  /** Límite en 0: la categoría no tiene tope, así que nunca se "pasa". */
  sinTope: boolean;
}

export interface ResumenAhorroPeriodo {
  /**
   * En el periodo de cobro, lo apartado del sueldo (los extras no cuentan).
   * En el mes, cuando no es el periodo de cobro, todo el ahorro neto.
   */
  neto: Centavos;
  /** Periodo de cobro: el aporte por cobro. Si no, en el mes: la meta mensual. */
  objetivo: Centavos;
  cumplido: boolean;
  falta: Centavos;
}

export interface Resumen {
  presupuesto: Centavos;
  gastado: Centavos;
  /** Presupuesto − gastado. Negativo cuando me pasé. */
  disponible: Centavos;
  porcentajeUsado: number;
  diasRestantes: number;
  /**
   * "Puedo gastar $X por día": lo disponible repartido entre los días que
   * quedan, HOY incluido. Es la cifra que responde "¿me puedo dar este gusto?"
   * sin hacer cuentas (la idea de "safe to spend" de PocketGuard y similares).
   */
  porDia: Centavos;
  categorias: ResumenCategoria[];
  excedidas: ResumenCategoria[];
  ingresos: Centavos;
  ahorro: ResumenAhorroPeriodo;
  /** Aportes extra del periodo: suman a la meta del mes, no al aporte del cobro. */
  ahorroExtra: Centavos;
  /** ¿Este periodo va de cobro a cobro? Ahí se recuerda el "págate primero". */
  esPeriodoDeCobro: boolean;
  ultimosGastos: Gasto[];
  cantidadGastos: number;
  esPeriodoActual: boolean;
}

const ULTIMOS = 5;

export function resumirCategorias(
  gastos: readonly Gasto[],
  categorias: readonly Categoria[],
  periodo: Periodo,
): ResumenCategoria[] {
  const gastadoPorCategoria = new Map<string, Centavos>();
  for (const gasto of gastos) {
    gastadoPorCategoria.set(
      gasto.categoria,
      (gastadoPorCategoria.get(gasto.categoria) ?? 0) + gasto.montoCentavos,
    );
  }

  // Gastos de una categoría que ya no existe: se muestran aparte en vez de
  // desaparecer de los totales.
  const conocidas = new Set(categorias.map((categoria) => categoria.id));
  const huerfanas: Categoria[] = [...gastadoPorCategoria.keys()]
    .filter((id) => !conocidas.has(id))
    .map((id) => ({ ...SIN_CATEGORIA, id }));

  return (
    [...categorias]
      .sort((a, b) => a.orden - b.orden)
      .concat(huerfanas)
      .map((categoria, orden) => {
        const gastado = gastadoPorCategoria.get(categoria.id) ?? 0;
        const limite = limiteEnPeriodo(categoria.limiteMensualCentavos, periodo.tipo);
        const sinTope = limite === 0;
        return {
          orden,
          resumen: {
            categoria,
            gastado,
            limite,
            restante: limite - gastado,
            porcentaje: sinTope ? 0 : porcentaje(gastado, limite),
            excedido: !sinTope && gastado > limite,
            sinTope,
          },
        };
      })
      // Lo que más pesa, arriba; a igualdad, el orden elegido (estable).
      .sort((a, b) => b.resumen.gastado - a.resumen.gastado || a.orden - b.orden)
      .map(({ resumen }) => resumen)
  );
}

/**
 * Contra qué se mide el ahorro del periodo:
 *  - periodo de cobro (quincena, o mes si cobro mensual): el aporte por cobro,
 *    y sólo cuenta lo apartado del sueldo;
 *  - mes con cobro quincenal: la meta mensual, y cuenta todo;
 *  - quincena con cobro mensual: no hay cobro que apartar, sin objetivo.
 */
function ahorroDelPeriodo(
  { periodo, plan, movimientosAhorro }: EntradaResumen,
  esPeriodoDeCobro: boolean,
): Pick<ResumenAhorroPeriodo, 'objetivo' | 'neto'> {
  if (esPeriodoDeCobro) {
    return {
      objetivo: plan.aporteQuincenalCentavos,
      neto: aportesDeSueldoEn(movimientosAhorro, periodo),
    };
  }
  return {
    objetivo: periodo.tipo === 'mes' ? plan.metaMensualCentavos : 0,
    neto: ahorroNetoEn(movimientosAhorro, periodo),
  };
}

export function calcularResumen(entrada: EntradaResumen): Resumen {
  const { periodo, hoy, plan } = entrada;

  // El ISD y su devolución mueven el saldo de la cuenta, pero no son ni gasto
  // ni ingreso del periodo: la plata sale y vuelve.
  // En la lista de últimos gastos sí aparecen, como en Movimientos.
  const gastosDelPeriodo = entrada.gastos.filter((gasto) => contieneFecha(periodo, gasto.fecha));
  const gastos = gastosDelPeriodo.filter(cuentaEnPresupuesto);
  const ingresos = entrada.ingresos.filter(
    (ingreso) => contieneFecha(periodo, ingreso.fecha) && !esDevolucionIsd(ingreso),
  );

  const categorias = resumirCategorias(gastos, entrada.categorias, periodo);
  const totalPresupuesto = sumar(categorias.map((c) => c.limite));
  const gastado = sumar(gastos.map((g) => g.montoCentavos));
  const disponible = totalPresupuesto - gastado;
  const dias = diasRestantes(periodo, hoy);

  const esPeriodoDeCobro = periodo.tipo === tipoPeriodoDeCobro(plan.cobrosPorMes);
  const { objetivo, neto } = ahorroDelPeriodo(entrada, esPeriodoDeCobro);

  const ultimosGastos = [...gastosDelPeriodo]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn))
    .slice(0, ULTIMOS);

  return {
    presupuesto: totalPresupuesto,
    gastado,
    disponible,
    porcentajeUsado: porcentaje(gastado, totalPresupuesto),
    diasRestantes: dias,
    porDia: dias > 0 && disponible > 0 ? Math.floor(disponible / dias) : 0,
    categorias,
    excedidas: categorias.filter((c) => c.excedido),
    ingresos: sumar(ingresos.map((i) => i.montoCentavos)),
    ahorro: {
      neto,
      objetivo,
      cumplido: objetivo > 0 && neto >= objetivo,
      falta: Math.max(0, objetivo - neto),
    },
    ahorroExtra: aportesExtraEn(entrada.movimientosAhorro, periodo),
    esPeriodoDeCobro,
    ultimosGastos,
    cantidadGastos: gastosDelPeriodo.length,
    esPeriodoActual: contieneFecha(periodo, hoy),
  };
}
