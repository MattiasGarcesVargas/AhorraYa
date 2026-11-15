import {
  aFechaIso,
  deFechaIso,
  diasEntreInclusive,
  formatDiaMes,
  sumarDias,
  ultimoDiaDelMes,
  type FechaIso,
} from './fechas';

/**
 * Periodos con los que se lee el dinero.
 *
 * La QUINCENA va de día de pago a día de pago, no del 1 al 15: el sueldo
 * llega el 15 y el último día del mes, y "vivo con lo que queda hasta el
 * siguiente pago". Así, en noviembre de 2026:
 *   - 15 nov – 29 nov  (cobro del 15)
 *   - 30 nov – 14 dic  (cobro del último día)
 *
 * El MES es el de calendario: contiene exactamente los dos días de pago
 * (el 15 y el último), así que es donde se mide la meta de ahorro mensual.
 */
export type TipoPeriodo = 'quincena' | 'mes';

export interface Periodo {
  tipo: TipoPeriodo;
  /** Primer día, incluido. */
  inicio: FechaIso;
  /** Último día, incluido. */
  fin: FechaIso;
}

export const DIA_PAGO_MITAD = 15;

function inicioQuincena(fecha: Date): Date {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const dia = fecha.getDate();
  const ultimo = ultimoDiaDelMes(anio, mes);

  if (dia === ultimo) return new Date(anio, mes, ultimo);
  if (dia >= DIA_PAGO_MITAD) return new Date(anio, mes, DIA_PAGO_MITAD);

  // Del 1 al 14 se sigue viviendo del pago del último día del mes anterior.
  return new Date(anio, mes, 0);
}

function finQuincena(inicio: Date): Date {
  const anio = inicio.getFullYear();
  const mes = inicio.getMonth();

  if (inicio.getDate() === DIA_PAGO_MITAD) {
    // Hasta el día antes del último del mes.
    return new Date(anio, mes, ultimoDiaDelMes(anio, mes) - 1);
  }
  // Empezó el último día: llega hasta el 14 del mes siguiente.
  return new Date(anio, mes + 1, DIA_PAGO_MITAD - 1);
}

export function quincenaQueContiene(fecha: FechaIso): Periodo {
  const inicio = inicioQuincena(deFechaIso(fecha));
  return { tipo: 'quincena', inicio: aFechaIso(inicio), fin: aFechaIso(finQuincena(inicio)) };
}

export function mesQueContiene(fecha: FechaIso): Periodo {
  const d = deFechaIso(fecha);
  const anio = d.getFullYear();
  const mes = d.getMonth();
  return {
    tipo: 'mes',
    inicio: aFechaIso(new Date(anio, mes, 1)),
    fin: aFechaIso(new Date(anio, mes, ultimoDiaDelMes(anio, mes))),
  };
}

export function periodoQueContiene(tipo: TipoPeriodo, fecha: FechaIso): Periodo {
  return tipo === 'quincena' ? quincenaQueContiene(fecha) : mesQueContiene(fecha);
}

/** El periodo anterior (`pasos < 0`) o siguiente (`pasos > 0`). */
export function desplazarPeriodo(periodo: Periodo, pasos: number): Periodo {
  let actual = periodo;
  for (let i = 0; i < Math.abs(pasos); i++) {
    const referencia = pasos > 0 ? sumarDias(actual.fin, 1) : sumarDias(actual.inicio, -1);
    actual = periodoQueContiene(periodo.tipo, referencia);
  }
  return actual;
}

export function contieneFecha(periodo: Periodo, fecha: FechaIso): boolean {
  return fecha >= periodo.inicio && fecha <= periodo.fin;
}

export function duracionDias(periodo: Periodo): number {
  return diasEntreInclusive(periodo.inicio, periodo.fin);
}

/**
 * Días que quedan contando HOY, porque hoy todavía se puede gastar.
 * 0 si el periodo ya terminó; la duración entera si aún no empieza.
 */
export function diasRestantes(periodo: Periodo, hoy: FechaIso): number {
  if (hoy > periodo.fin) return 0;
  if (hoy < periodo.inicio) return duracionDias(periodo);
  return diasEntreInclusive(hoy, periodo.fin);
}

/** `15 – 29 nov` o `30 nov – 14 dic`. */
export function etiquetaPeriodo(periodo: Periodo): string {
  const inicio = deFechaIso(periodo.inicio);
  const fin = deFechaIso(periodo.fin);
  const mismoMes = inicio.getMonth() === fin.getMonth();

  return mismoMes
    ? `${inicio.getDate()} – ${formatDiaMes(periodo.fin)}`
    : `${formatDiaMes(periodo.inicio)} – ${formatDiaMes(periodo.fin)}`;
}

/** Las quincenas que tocan un rango, de la más reciente a la más antigua. */
export function quincenasHastaAtras(desde: FechaIso, cantidad: number): Periodo[] {
  const resultado: Periodo[] = [];
  let actual = quincenaQueContiene(desde);
  for (let i = 0; i < cantidad; i++) {
    resultado.push(actual);
    actual = desplazarPeriodo(actual, -1);
  }
  return resultado;
}
