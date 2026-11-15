import { sumar, type Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import type { Periodo } from '@/lib/periodos';
import type { Gasto } from '@/modules/gastos/gastos.types';
import { tipoIngresoPorId, type Ingreso } from '@/modules/ingresos/ingresos.types';

import type { MovimientoCuenta } from '../cuentas.types';
import type { DiaCuenta } from './interes';
import { efectoEnCuenta, saldoAlCierre } from './saldos';

/** De dónde sale una línea del libro, para poder abrirla y corregirla. */
export interface OrigenLinea {
  tipo: 'gasto' | 'ingreso' | 'movimiento';
  id: number;
}

/** Algo que entró o salió de la cuenta, ya con su nombre para mostrar. */
export interface AsientoDetallado {
  clave: string;
  fecha: FechaIso;
  creadoEn: string;
  concepto: string;
  detalle: string | null;
  /** Con signo: lo que entra suma, lo que sale resta. */
  importe: Centavos;
  origen: OrigenLinea;
}

export interface LineaLibro {
  clave: string;
  fecha: FechaIso;
  concepto: string;
  detalle: string | null;
  /** Lo que entró a la cuenta (0 si la línea es una salida). */
  entra: Centavos;
  /** Lo que salió de la cuenta (0 si la línea es una entrada). */
  sale: Centavos;
  /** Saldo de la cuenta después de esta línea. */
  saldo: Centavos;
  /** `null` en las líneas de interés: no se editan, se calculan. */
  origen: OrigenLinea | null;
}

/** El "debe y haber" de una cuenta en un periodo. */
export interface Libro {
  saldoAlInicio: Centavos;
  lineas: LineaLibro[];
  totalEntra: Centavos;
  totalSale: Centavos;
  /** Interés acreditado en el periodo (ya incluido en `totalEntra`). */
  interes: Centavos;
  saldoAlCierre: Centavos;
}

export interface NombresLibro {
  categoria: (id: string) => string;
  cuenta: (id: number) => string;
}

function conceptoDeMovimiento(
  movimiento: MovimientoCuenta,
  cuentaId: number,
  nombres: NombresLibro,
): string {
  const propia = movimiento.cuentaId === cuentaId;
  const otra = propia ? movimiento.contraparteId : movimiento.cuentaId;
  const nombreOtra = otra === null ? null : nombres.cuenta(otra);

  switch (movimiento.tipo) {
    case 'inicial':
      return 'Saldo inicial';
    case 'ajuste':
      return 'Ajuste con el banco';
    case 'aporte':
      if (!propia) return `Transferencia a ${nombreOtra}`;
      return nombreOtra ? `Aporte desde ${nombreOtra}` : 'Aporte';
    case 'retiro':
      if (!propia) return `Transferencia desde ${nombreOtra}`;
      return nombreOtra ? `Retiro hacia ${nombreOtra}` : 'Retiro';
  }
}

/**
 * Junta lo que tocó una cuenta — movimientos propios, transferencias desde o
 * hacia otra cuenta, gastos pagados con ella e ingresos recibidos en ella — en
 * una sola lista con nombre y signo.
 */
export function asientosDetallados(
  cuentaId: number,
  fuentes: {
    movimientos: readonly MovimientoCuenta[];
    gastos: readonly Gasto[];
    ingresos: readonly Ingreso[];
  },
  nombres: NombresLibro,
): AsientoDetallado[] {
  const asientos: AsientoDetallado[] = [];

  for (const movimiento of fuentes.movimientos) {
    const importe = efectoEnCuenta(movimiento, cuentaId);
    if (importe === 0) continue;
    asientos.push({
      clave: `movimiento-${movimiento.id}`,
      fecha: movimiento.fecha,
      creadoEn: movimiento.creadoEn,
      concepto: conceptoDeMovimiento(movimiento, cuentaId, nombres),
      detalle: movimiento.nota,
      importe,
      origen: { tipo: 'movimiento', id: movimiento.id },
    });
  }

  for (const gasto of fuentes.gastos) {
    if (gasto.cuentaId !== cuentaId) continue;
    const categoria = nombres.categoria(gasto.categoria);
    asientos.push({
      clave: `gasto-${gasto.id}`,
      fecha: gasto.fecha,
      creadoEn: gasto.creadoEn,
      concepto: gasto.nota ?? categoria,
      detalle: gasto.nota ? `Gasto · ${categoria}` : 'Gasto',
      importe: -gasto.montoCentavos,
      origen: { tipo: 'gasto', id: gasto.id },
    });
  }

  for (const ingreso of fuentes.ingresos) {
    if (ingreso.cuentaId !== cuentaId) continue;
    const tipo = tipoIngresoPorId(ingreso.tipo).nombre;
    asientos.push({
      clave: `ingreso-${ingreso.id}`,
      fecha: ingreso.fecha,
      creadoEn: ingreso.creadoEn,
      concepto: ingreso.nota ?? tipo,
      detalle: ingreso.nota ? `Ingreso · ${tipo}` : 'Ingreso',
      importe: ingreso.montoCentavos,
      origen: { tipo: 'ingreso', id: ingreso.id },
    });
  }

  return asientos;
}

/**
 * Arma el libro de un periodo: saldo con el que se abrió, cada línea con su
 * entrada o salida y el saldo que dejó, y el cierre.
 *
 * El interés llega todos los días, pero treinta líneas de centavos taparían
 * lo importante. Por eso se junta: antes de cada día con movimientos aparece
 * UNA línea con el interés acumulado desde la línea anterior, y otra al final.
 * Así cada saldo sigue cuadrando con el de la línea de arriba.
 *
 * `serie` es la cuenta día por día (ver `serieDiaria`) y `asientos` los de
 * esta cuenta; se toman sólo los que caen en el periodo.
 */
export function construirLibro(
  periodo: Periodo,
  serie: readonly DiaCuenta[],
  asientos: readonly AsientoDetallado[],
): Libro {
  const saldoAlInicio = saldoAlCierre(serie, anterior(periodo.inicio, serie));
  const porDia = new Map<FechaIso, AsientoDetallado[]>();
  for (const asiento of asientos) {
    if (asiento.fecha < periodo.inicio || asiento.fecha > periodo.fin) continue;
    const delDia = porDia.get(asiento.fecha) ?? [];
    delDia.push(asiento);
    porDia.set(asiento.fecha, delDia);
  }

  const lineas: LineaLibro[] = [];
  let saldo = saldoAlInicio;
  let interesPendiente = 0;
  let diasDeInteres = 0;
  let ultimaFecha: FechaIso | null = null;

  const volcarInteres = (fecha: FechaIso) => {
    if (interesPendiente === 0) return;
    saldo += interesPendiente;
    lineas.push({
      clave: `interes-${fecha}-${lineas.length}`,
      fecha,
      concepto: 'Interés ganado',
      detalle: diasDeInteres === 1 ? '1 día' : `${diasDeInteres} días`,
      entra: interesPendiente,
      sale: 0,
      saldo,
      origen: null,
    });
    interesPendiente = 0;
    diasDeInteres = 0;
  };

  for (const dia of serie) {
    if (dia.fecha < periodo.inicio || dia.fecha > periodo.fin) continue;
    ultimaFecha = dia.fecha;
    if (dia.interes > 0) {
      interesPendiente += dia.interes;
      diasDeInteres += 1;
    }

    const delDia = porDia.get(dia.fecha);
    if (!delDia) continue;

    volcarInteres(dia.fecha);
    for (const asiento of [...delDia].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))) {
      saldo += asiento.importe;
      lineas.push({
        clave: asiento.clave,
        fecha: asiento.fecha,
        concepto: asiento.concepto,
        detalle: asiento.detalle,
        entra: Math.max(0, asiento.importe),
        sale: Math.max(0, -asiento.importe),
        saldo,
        origen: asiento.origen,
      });
    }
  }
  if (ultimaFecha) volcarInteres(ultimaFecha);

  return {
    saldoAlInicio,
    lineas,
    totalEntra: sumar(lineas.map((linea) => linea.entra)),
    totalSale: sumar(lineas.map((linea) => linea.sale)),
    interes: sumar(lineas.filter((linea) => linea.origen === null).map((linea) => linea.entra)),
    saldoAlCierre: saldo,
  };
}

/** El último día de la serie anterior a `fecha` ('' si no hay ninguno). */
function anterior(fecha: FechaIso, serie: readonly DiaCuenta[]): FechaIso {
  let previo = '';
  for (const dia of serie) {
    if (dia.fecha >= fecha) break;
    previo = dia.fecha;
  }
  return previo;
}
