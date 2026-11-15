import { sumar, type Centavos } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';

import type {
  Cuenta,
  MovimientoCuenta,
  TasaCuenta,
  TipoCuenta,
  TotalDiarioCuenta,
} from '../cuentas.types';
import {
  interesDiarioEstimado,
  serieDiaria,
  tasaVigente,
  type Asiento,
  type DiaCuenta,
} from './interes';

/** Todo lo que mueve el saldo de las cuentas, venga del módulo que venga. */
export interface FuentesSaldos {
  movimientos: readonly MovimientoCuenta[];
  /** Gastos pagados desde una cuenta, sumados por día. */
  gastosPorDia: readonly TotalDiarioCuenta[];
  /** Ingresos recibidos en una cuenta, sumados por día. */
  ingresosPorDia: readonly TotalDiarioCuenta[];
  tasas: readonly TasaCuenta[];
}

/**
 * Lo que un movimiento le hace al saldo de UNA cuenta, con signo. Una
 * transferencia entre cuentas propias es un solo movimiento: suma en una y
 * resta en la otra. 0 si el movimiento no toca esa cuenta.
 */
export function efectoEnCuenta(
  movimiento: Pick<MovimientoCuenta, 'cuentaId' | 'contraparteId' | 'tipo' | 'montoCentavos'>,
  cuentaId: number,
): Centavos {
  const { tipo, montoCentavos } = movimiento;

  if (movimiento.cuentaId === cuentaId) {
    return tipo === 'retiro' ? -montoCentavos : montoCentavos;
  }
  if (movimiento.contraparteId === cuentaId) {
    if (tipo === 'aporte') return -montoCentavos;
    if (tipo === 'retiro') return montoCentavos;
  }
  return 0;
}

export function asientosDeCuenta(cuentaId: number, fuentes: FuentesSaldos): Asiento[] {
  const asientos: Asiento[] = [];

  for (const movimiento of fuentes.movimientos) {
    const importe = efectoEnCuenta(movimiento, cuentaId);
    if (importe !== 0) asientos.push({ fecha: movimiento.fecha, importe });
  }
  for (const dia of fuentes.gastosPorDia) {
    if (dia.cuentaId === cuentaId) asientos.push({ fecha: dia.fecha, importe: -dia.totalCentavos });
  }
  for (const dia of fuentes.ingresosPorDia) {
    if (dia.cuentaId === cuentaId) asientos.push({ fecha: dia.fecha, importe: dia.totalCentavos });
  }
  return asientos;
}

export interface SaldoCuenta {
  cuenta: Cuenta;
  /** Lo que hay hoy en la cuenta, intereses incluidos. */
  saldo: Centavos;
  /** Tasa anual vigente hoy, en puntos básicos. */
  tasaBp: number;
  /** Interés acreditado hoy. */
  interesHoy: Centavos;
  /** Interés acreditado en lo que va del mes. */
  interesMes: Centavos;
  /** Interés acreditado desde que se lleva la cuenta. */
  interesTotal: Centavos;
  /** Lo que pagará mañana si el saldo no cambia. */
  interesDiario: Centavos;
  /** La cuenta día por día: de aquí sale el libro. */
  serie: DiaCuenta[];
}

export function calcularSaldoCuenta(
  cuenta: Cuenta,
  fuentes: FuentesSaldos,
  hoy: FechaIso,
): SaldoCuenta {
  const tasas = fuentes.tasas.filter((tasa) => tasa.cuentaId === cuenta.id);
  const serie = serieDiaria(asientosDeCuenta(cuenta.id, fuentes), tasas, hoy);

  const ultimo = serie.at(-1);
  const saldo = ultimo?.saldo ?? 0;
  const tasaBp = tasaVigente(tasas, hoy);
  const mes = hoy.slice(0, 7);

  return {
    cuenta,
    saldo,
    tasaBp,
    interesHoy: ultimo?.fecha === hoy ? ultimo.interes : 0,
    interesMes: sumar(serie.filter((dia) => dia.fecha.startsWith(mes)).map((dia) => dia.interes)),
    interesTotal: sumar(serie.map((dia) => dia.interes)),
    interesDiario: interesDiarioEstimado(saldo, tasaBp),
    serie,
  };
}

export function calcularSaldos(
  cuentas: readonly Cuenta[],
  fuentes: FuentesSaldos,
  hoy: FechaIso,
): SaldoCuenta[] {
  return cuentas.map((cuenta) => calcularSaldoCuenta(cuenta, fuentes, hoy));
}

export interface TotalesCuentas {
  /** Todo lo que tengo, sumando todas las cuentas. */
  patrimonio: Centavos;
  /** Lo que está en cuentas flexibles: el ahorro. */
  ahorros: Centavos;
  /** Lo que está en cuentas del día a día: para gastar. */
  disponible: Centavos;
  interesHoy: Centavos;
  interesMes: Centavos;
  interesDiario: Centavos;
}

export function totalizar(saldos: readonly SaldoCuenta[]): TotalesCuentas {
  const deTipo = (tipo: TipoCuenta) =>
    sumar(saldos.filter((s) => s.cuenta.tipo === tipo).map((s) => s.saldo));

  return {
    patrimonio: sumar(saldos.map((s) => s.saldo)),
    ahorros: deTipo('flexible'),
    disponible: deTipo('diaria'),
    interesHoy: sumar(saldos.map((s) => s.interesHoy)),
    interesMes: sumar(saldos.map((s) => s.interesMes)),
    interesDiario: sumar(saldos.map((s) => s.interesDiario)),
  };
}

/** La primera cuenta de un tipo, en el orden elegido: la que se propone por defecto. */
export function cuentaPrincipal(cuentas: readonly Cuenta[], tipo: TipoCuenta): Cuenta | undefined {
  return [...cuentas].sort((a, b) => a.orden - b.orden || a.id - b.id).find((c) => c.tipo === tipo);
}

/** Saldo de la cuenta al cierre de un día (0 antes de su primer movimiento). */
export function saldoAlCierre(serie: readonly DiaCuenta[], fecha: FechaIso): Centavos {
  let saldo = 0;
  for (const dia of serie) {
    if (dia.fecha > fecha) break;
    saldo = dia.saldo;
  }
  return saldo;
}
