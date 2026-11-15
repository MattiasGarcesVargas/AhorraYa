/**
 * Fechas de calendario como texto `yyyy-MM-dd`.
 *
 * Un gasto pertenece a un DÍA, no a un instante: guardarlo como `Date` en UTC
 * haría que un café a las 21:00 en Ecuador (UTC-5) cayera al día siguiente. Con
 * el texto local del día no hay zona horaria que lo mueva, y además se ordena
 * y compara como texto.
 *
 * Los nombres de meses van escritos aquí y no con `Intl`: así el formato es el
 * mismo en iOS, Android, web y en los tests de Node.
 */
export type FechaIso = string;

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function aFechaIso(fecha: Date): FechaIso {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Medianoche local del día indicado. */
export function deFechaIso(fecha: FechaIso): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function hoyIso(ahora: Date = new Date()): FechaIso {
  return aFechaIso(ahora);
}

export function sumarDias(fecha: FechaIso, dias: number): FechaIso {
  const base = deFechaIso(fecha);
  base.setDate(base.getDate() + dias);
  return aFechaIso(base);
}

export function ultimoDiaDelMes(anio: number, mesIndice: number): number {
  return new Date(anio, mesIndice + 1, 0).getDate();
}

/** Días entre dos fechas, contando ambas: del 15 al 29 son 15 días. */
export function diasEntreInclusive(desde: FechaIso, hasta: FechaIso): number {
  const ms = deFechaIso(hasta).getTime() - deFechaIso(desde).getTime();
  // Se redondea porque un cambio de horario deja días de 23 o 25 horas.
  return Math.round(ms / 86_400_000) + 1;
}

export function esFechaIso(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  return aFechaIso(deFechaIso(valor)) === valor;
}

/** `15 nov` */
export function formatDiaMes(fecha: FechaIso): string {
  const d = deFechaIso(fecha);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

/** `noviembre 2026` */
export function formatMesAnio(fecha: FechaIso): string {
  const d = deFechaIso(fecha);
  return `${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`;
}

/** `Hoy`, `Ayer`, `Lunes 9 nov`. Para encabezados de listas por día. */
export function formatDiaRelativo(fecha: FechaIso, hoy: FechaIso = hoyIso()): string {
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDias(hoy, -1)) return 'Ayer';

  const d = deFechaIso(fecha);
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${formatDiaMes(fecha)}`;
}

/** `Domingo, 8 de noviembre` para el encabezado del inicio. */
export function formatFechaLarga(fecha: FechaIso): string {
  const d = deFechaIso(fecha);
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
}

/** `8 de noviembre de 2026`, para documentos (estado de cuenta). */
export function formatFechaCompleta(fecha: FechaIso): string {
  const d = deFechaIso(fecha);
  return `${d.getDate()} de ${MESES_LARGOS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** `08/11/2026`: corto y sin ambigüedad para columnas de tablas. */
export function formatFechaNumerica(fecha: FechaIso): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
