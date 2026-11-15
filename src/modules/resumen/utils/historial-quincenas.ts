import { sumar, type Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import { contieneFecha, type Periodo } from '@/lib/periodos';
import type { MovimientoAhorro } from '@/modules/ahorro/ahorro.types';
import { aportesDeSueldoEn, aportesExtraEn } from '@/modules/ahorro/utils/calculos-ahorro';
import type { Categoria } from '@/modules/categorias/categorias.types';
import { totalPresupuestoMensual } from '@/modules/categorias/utils/catalogo';
import type { Gasto } from '@/modules/gastos/gastos.types';
import { cuentaEnPresupuesto } from '@/modules/gastos/utils/impuestos-exterior';
import type { Ingreso } from '@/modules/ingresos/ingresos.types';
import { esDevolucionIsd } from '@/modules/ingresos/utils/devolucion';
import type { Plan } from '@/modules/plan/plan.types';
import { limiteEnPeriodo } from '@/modules/plan/utils/calculos-plan';

/** Una fila de la tabla "Quincenas" de mi Excel: un periodo de cobro (quincena o mes). */
export interface FilaQuincena {
  periodo: Periodo;
  ingresos: Centavos;
  gastado: Centavos;
  presupuesto: Centavos;
  /** Lo apartado del sueldo: es lo que se compara con el aporte por cobro. */
  ahorrado: Centavos;
  /** Aportes extra del periodo: se muestran aparte, no cumplen el aporte. */
  extra: Centavos;
  objetivo: Centavos;
  /** ¿Aparté lo que tocaba? */
  cumplido: boolean;
  enCurso: boolean;
}

export interface EntradaHistorial {
  /** Los periodos de cobro a listar: quincenas, o meses si se cobra una vez al mes. */
  quincenas: readonly Periodo[];
  hoy: FechaIso;
  gastos: readonly Gasto[];
  ingresos: readonly Ingreso[];
  movimientosAhorro: readonly MovimientoAhorro[];
  categorias: readonly Categoria[];
  plan: Plan;
}

export function historialQuincenas(entrada: EntradaHistorial): FilaQuincena[] {
  const presupuestoMensual = totalPresupuestoMensual(entrada.categorias);
  // El ISD y su devolución no son gasto ni ingreso: la plata sale y vuelve.
  const gastos = entrada.gastos.filter(cuentaEnPresupuesto);
  const ingresos = entrada.ingresos.filter((ingreso) => !esDevolucionIsd(ingreso));

  return entrada.quincenas.map((periodo) => {
    const ahorrado = aportesDeSueldoEn(entrada.movimientosAhorro, periodo);
    return {
      periodo,
      ingresos: sumar(
        ingresos.filter((i) => contieneFecha(periodo, i.fecha)).map((i) => i.montoCentavos),
      ),
      gastado: sumar(
        gastos.filter((g) => contieneFecha(periodo, g.fecha)).map((g) => g.montoCentavos),
      ),
      presupuesto: limiteEnPeriodo(presupuestoMensual, periodo.tipo),
      ahorrado,
      extra: aportesExtraEn(entrada.movimientosAhorro, periodo),
      objetivo: entrada.plan.aporteQuincenalCentavos,
      cumplido: ahorrado >= entrada.plan.aporteQuincenalCentavos,
      enCurso: contieneFecha(periodo, entrada.hoy),
    };
  });
}
