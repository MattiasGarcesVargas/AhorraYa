import type { Centavos } from '@/lib/dinero';
import { sumarDias, type FechaIso } from '@/lib/fechas';

import type { TasaCuenta } from '../cuentas.types';

const PUNTOS_BASICOS = 10_000;
/** El banco reparte la tasa anual entre los 365 días del año. */
const DIAS_DEL_ANIO = 365;

/** Algo que entró (+) o salió (−) de la cuenta un día, sin contar intereses. */
export interface Asiento {
  fecha: FechaIso;
  importe: Centavos;
}

/** La cuenta al cierre de un día. */
export interface DiaCuenta {
  fecha: FechaIso;
  /** Interés acreditado ese día (lo que generó el saldo de la víspera). */
  interes: Centavos;
  /** Neto de lo que entró y salió ese día. */
  movimientos: Centavos;
  saldo: Centavos;
}

/** Interés de UN día sobre un saldo, en centavos con decimales. */
function interesDeUnDia(saldo: Centavos, tasaBp: number): number {
  if (saldo <= 0 || tasaBp <= 0) return 0;
  return (saldo * tasaBp) / PUNTOS_BASICOS / DIAS_DEL_ANIO;
}

/**
 * A dos decimales SIN redondear hacia arriba: $ 0.3555 son 35 centavos, no 36.
 * El épsilon evita que 36.999999999 (por coma flotante) pierda un centavo entero.
 */
function centavosEnteros(centavos: number): Centavos {
  return Math.floor(centavos + 1e-9);
}

/** La tasa que rige un día: la última fijada ese día o antes. */
export function tasaVigente(tasas: readonly TasaCuenta[], fecha: FechaIso): number {
  let vigente: TasaCuenta | undefined;
  for (const tasa of tasas) {
    if (tasa.desde <= fecha && (!vigente || tasa.desde >= vigente.desde)) vigente = tasa;
  }
  return vigente?.tasaBp ?? 0;
}

/**
 * La cuenta día por día, desde su primer asiento hasta `hasta`.
 *
 * Cómo se calcula el interés (igual que una cuenta flexible): cada día el
 * banco paga `saldo × tasa anual ÷ 365` sobre lo que había al cierre del día
 * anterior, y ese pago se SUMA al saldo, así que al día siguiente también
 * genera interés. El pago de cada día se corta a dos decimales, sin redondear
 * hacia arriba (lo que sobra de un centavo no se acumula).
 *
 * El interés no se guarda en la base: sale de aquí. Por eso retirar, aportar
 * o corregir un movimiento de hace un mes recalcula todo sin tocar nada más.
 * `tasas` son las de ESTA cuenta.
 */
export function serieDiaria(
  asientos: readonly Asiento[],
  tasas: readonly TasaCuenta[],
  hasta: FechaIso,
): DiaCuenta[] {
  const netoPorDia = new Map<FechaIso, Centavos>();
  let primerDia: FechaIso | null = null;

  for (const asiento of asientos) {
    if (asiento.fecha > hasta) continue;
    netoPorDia.set(asiento.fecha, (netoPorDia.get(asiento.fecha) ?? 0) + asiento.importe);
    if (primerDia === null || asiento.fecha < primerDia) primerDia = asiento.fecha;
  }
  if (primerDia === null) return [];

  const dias: DiaCuenta[] = [];
  let saldo = 0;
  let tasaDeAyer = 0;

  for (let fecha = primerDia; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
    const interes = centavosEnteros(interesDeUnDia(saldo, tasaDeAyer));

    const movimientos = netoPorDia.get(fecha) ?? 0;
    saldo += interes + movimientos;
    dias.push({ fecha, interes, movimientos, saldo });

    tasaDeAyer = tasaVigente(tasas, fecha);
  }
  return dias;
}

/** Lo que pagará el banco mañana por el saldo de hoy, cortado a dos decimales. */
export function interesDiarioEstimado(saldo: Centavos, tasaBp: number): Centavos {
  return centavosEnteros(interesDeUnDia(saldo, tasaBp));
}

/**
 * Interés que se ganaría en `dias` si no se toca la cuenta, con el interés de
 * cada día sumándose al saldo.
 */
export function proyectarInteres(saldo: Centavos, tasaBp: number, dias: number): Centavos {
  if (saldo <= 0 || tasaBp <= 0 || dias <= 0) return 0;
  const tasaDiaria = tasaBp / PUNTOS_BASICOS / DIAS_DEL_ANIO;
  return Math.round(saldo * ((1 + tasaDiaria) ** dias - 1));
}

/** `500` → `5%`, `475` → `4.75%`. */
export function formatTasa(tasaBp: number): string {
  const porcentaje = (tasaBp / 100).toFixed(2).replace(/\.?0+$/, '');
  return `${porcentaje}%`;
}

/** `"5"`, `"4,75"`, `"4.75 %"` → puntos básicos. `null` si no es un porcentaje. */
export function interpretarTasa(texto: string): number | null {
  const limpio = texto.replace(/[\s%]/g, '').replace(',', '.');
  if (limpio === '') return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(limpio)) return null;
  return Math.round(Number(limpio) * 100);
}
