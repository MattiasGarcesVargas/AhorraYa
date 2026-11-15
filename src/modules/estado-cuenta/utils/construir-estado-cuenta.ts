import { metodoPagoPorId } from '@/constants/metodos-pago.constants';
import { porcentaje, sumar, type Centavos } from '@/lib/dinero';
import {
  deFechaIso,
  diasEntreInclusive,
  formatFechaCompleta,
  formatMesAnio,
  type FechaIso,
} from '@/lib/fechas';
import { contieneFecha, duracionDias, type Periodo } from '@/lib/periodos';
import type { MovimientoAhorro } from '@/modules/ahorro/ahorro.types';
import { ahorroNetoEn, saldoAhorro } from '@/modules/ahorro/utils/calculos-ahorro';
import type { CatalogoCategorias } from '@/modules/categorias/categorias.types';
import type { Gasto } from '@/modules/gastos/gastos.types';
import { cuentaEnPresupuesto } from '@/modules/gastos/utils/impuestos-exterior';
import { tipoIngresoPorId, type Ingreso } from '@/modules/ingresos/ingresos.types';
import { esDevolucionIsd } from '@/modules/ingresos/utils/devolucion';
import type { Plan } from '@/modules/plan/plan.types';
import { resumirCategorias } from '@/modules/resumen/utils/calcular-resumen';

import type {
  EstadoCuenta,
  FilaMetodoEstado,
  LineaAhorro,
  LineaCuenta,
} from '../estado-cuenta.types';

export interface EntradaEstadoCuenta {
  /** Un mes de calendario. */
  periodo: Periodo;
  hoy: FechaIso;
  gastos: readonly Gasto[];
  ingresos: readonly Ingreso[];
  /** TODOS los movimientos de ahorro: hacen falta los anteriores para el saldo de apertura. */
  movimientosAhorro: readonly MovimientoAhorro[];
  categorias: CatalogoCategorias;
  plan: Plan;
}

const CONCEPTO_AHORRO = {
  inicial: 'Saldo inicial registrado',
  aporte: 'Aporte',
  retiro: 'Retiro',
  ajuste: 'Ajuste con el banco',
} as const;

function enOrden<T extends { fecha: FechaIso; creadoEn: string }>(lista: readonly T[]): T[] {
  return [...lista].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn.localeCompare(b.creadoEn),
  );
}

function lineasDeCuenta(
  entrada: EntradaEstadoCuenta,
  ahorroDelMes: MovimientoAhorro[],
): LineaCuenta[] {
  const { categorias } = entrada;

  const conOrden: (LineaCuenta & { creadoEn: string })[] = [
    ...entrada.gastos.map((gasto) => {
      const categoria = categorias.porId(gasto.categoria).nombre;
      return {
        fecha: gasto.fecha,
        creadoEn: gasto.creadoEn,
        tipo: 'gasto' as const,
        concepto: gasto.nota ?? categoria,
        categoria,
        metodo: metodoPagoPorId(gasto.metodoPago).nombre,
        monto: -gasto.montoCentavos,
      };
    }),
    ...entrada.ingresos.map((ingreso) => ({
      fecha: ingreso.fecha,
      creadoEn: ingreso.creadoEn,
      tipo: 'ingreso' as const,
      concepto: ingreso.nota ?? tipoIngresoPorId(ingreso.tipo).nombre,
      categoria: null,
      metodo: null,
      monto: ingreso.montoCentavos,
    })),
    // Ni el saldo inicial ni un ajuste son plata que entró o salió del bolsillo.
    ...ahorroDelMes
      .filter((movimiento) => movimiento.tipo === 'aporte' || movimiento.tipo === 'retiro')
      .map((movimiento) => ({
        fecha: movimiento.fecha,
        creadoEn: movimiento.creadoEn,
        tipo: movimiento.tipo as 'aporte' | 'retiro',
        concepto: movimiento.tipo === 'aporte' ? 'Transferencia al ahorro' : 'Retiro del ahorro',
        categoria: null,
        metodo: null,
        monto: movimiento.tipo === 'aporte' ? -movimiento.montoCentavos : movimiento.montoCentavos,
      })),
  ];

  return enOrden(conOrden).map(({ creadoEn: _creadoEn, ...linea }) => linea);
}

function lineasDeAhorro(saldoAlInicio: Centavos, delMes: MovimientoAhorro[]): LineaAhorro[] {
  let saldo = saldoAlInicio;
  return enOrden(delMes).map((movimiento) => {
    const monto =
      movimiento.tipo === 'retiro' ? -movimiento.montoCentavos : movimiento.montoCentavos;
    saldo += monto;
    return {
      fecha: movimiento.fecha,
      concepto: movimiento.nota ?? CONCEPTO_AHORRO[movimiento.tipo],
      monto,
      saldo,
    };
  });
}

function porMetodo(gastos: readonly Gasto[]): FilaMetodoEstado[] {
  const acumulado = new Map<string, FilaMetodoEstado>();
  for (const gasto of gastos) {
    const nombre = metodoPagoPorId(gasto.metodoPago).nombre;
    const fila = acumulado.get(nombre) ?? { nombre, cantidad: 0, total: 0 };
    fila.cantidad += 1;
    fila.total += gasto.montoCentavos;
    acumulado.set(nombre, fila);
  }
  return [...acumulado.values()].sort((a, b) => b.total - a.total);
}

/**
 * Arma el estado de cuenta de un mes. Función pura: no lee la base ni el
 * reloj (recibe `hoy`), así que se prueba con datos fijos.
 */
export function construirEstadoCuenta(entrada: EntradaEstadoCuenta): EstadoCuenta {
  const { periodo, hoy, plan } = entrada;

  const gastos = entrada.gastos.filter((g) => contieneFecha(periodo, g.fecha));
  const ingresos = entrada.ingresos.filter((i) => contieneFecha(periodo, i.fecha));
  const ahorroDelMes = entrada.movimientosAhorro.filter((m) => contieneFecha(periodo, m.fecha));
  const ahorroPrevio = entrada.movimientosAhorro.filter((m) => m.fecha < periodo.inicio);

  // El ISD y su devolución van y vuelven: salen en los movimientos (mueven la
  // cuenta) pero no son ni gasto ni ingreso del mes.
  const gastosReales = gastos.filter(cuentaEnPresupuesto);
  const ingresosReales = ingresos.filter((i) => !esDevolucionIsd(i));

  const totalGastos = sumar(gastosReales.map((g) => g.montoCentavos));
  const totalIngresos = sumar(ingresosReales.map((i) => i.montoCentavos));
  const aportes = sumar(
    ahorroDelMes.filter((m) => m.tipo === 'aporte').map((m) => m.montoCentavos),
  );
  const retiros = sumar(
    ahorroDelMes.filter((m) => m.tipo === 'retiro').map((m) => m.montoCentavos),
  );

  const saldoAlInicio = saldoAhorro(ahorroPrevio);
  const lineasAhorro = lineasDeAhorro(saldoAlInicio, ahorroDelMes);

  const alcanzado = ahorroNetoEn(entrada.movimientosAhorro, periodo);
  const objetivo = plan.metaMensualCentavos;

  const enCurso = hoy <= periodo.fin;
  const dias =
    enCurso && hoy >= periodo.inicio
      ? diasEntreInclusive(periodo.inicio, hoy)
      : duracionDias(periodo);

  const categorias = resumirCategorias(gastosReales, entrada.categorias.lista, periodo)
    // En un documento sobran las filas vacías: sólo lo que tuvo gasto o presupuesto.
    .filter((c) => c.gastado > 0 || c.limite > 0)
    .map((c) => ({
      nombre: c.categoria.nombre,
      color: c.categoria.color,
      gastado: c.gastado,
      limite: c.limite,
      diferencia: c.restante,
      porcentaje: c.porcentaje,
      excedido: c.excedido,
      sinTope: c.sinTope,
    }));

  const inicio = deFechaIso(periodo.inicio);
  const titulo = formatMesAnio(periodo.inicio);

  return {
    periodo,
    titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
    rango: `Del ${inicio.getDate()} al ${formatFechaCompleta(periodo.fin)}`,
    generadoEl: formatFechaCompleta(hoy),
    enCurso,
    totales: {
      ingresos: totalIngresos,
      gastos: totalGastos,
      aportes,
      retiros,
      ahorroNeto: aportes - retiros,
      flujoLibre: totalIngresos - totalGastos - aportes + retiros,
    },
    meta: {
      objetivo,
      alcanzado,
      porcentaje: porcentaje(Math.max(0, alcanzado), objetivo),
      cumplida: objetivo > 0 && alcanzado >= objetivo,
    },
    ahorro: {
      saldoAlInicio,
      saldoAlCierre: lineasAhorro.at(-1)?.saldo ?? saldoAlInicio,
      lineas: lineasAhorro,
    },
    categorias,
    metodos: porMetodo(gastosReales),
    movimientos: lineasDeCuenta({ ...entrada, gastos, ingresos }, ahorroDelMes),
    cantidadGastos: gastosReales.length,
    promedioDiario: dias > 0 ? Math.round(totalGastos / dias) : 0,
  };
}

/** `AhorraYa-estado-de-cuenta-2026-11`: ordena bien en la carpeta de Archivos. */
export function nombreArchivoEstadoCuenta(periodo: Periodo): string {
  return `AhorraYa-estado-de-cuenta-${periodo.inicio.slice(0, 7)}`;
}
