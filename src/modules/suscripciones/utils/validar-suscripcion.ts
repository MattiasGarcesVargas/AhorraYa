import { MAXIMO_CENTAVOS } from '@/lib/dinero';
import { deFechaIso, sumarDias, ultimoDiaDelMes, type FechaIso } from '@/lib/fechas';

import type { DatosSuscripcion } from '../suscripciones.types';
import { fechaDeCobro } from './fecha-de-cobro';

export const LARGO_MAXIMO_NOMBRE_SUSCRIPCION = 40;

export type ErroresSuscripcion = Partial<Record<keyof DatosSuscripcion, string>>;

export type ResultadoValidacion =
  { ok: true; datos: DatosSuscripcion } | { ok: false; errores: ErroresSuscripcion };

export function validarSuscripcion(datos: DatosSuscripcion): ResultadoValidacion {
  const errores: ErroresSuscripcion = {};
  const nombre = datos.nombre.trim().replace(/\s+/g, ' ');

  if (!nombre) errores.nombre = 'Escribe un nombre.';
  else if (nombre.length > LARGO_MAXIMO_NOMBRE_SUSCRIPCION) {
    errores.nombre = `Máximo ${LARGO_MAXIMO_NOMBRE_SUSCRIPCION} caracteres.`;
  }

  if (!Number.isInteger(datos.montoCentavos) || datos.montoCentavos <= 0) {
    errores.montoCentavos = 'El monto debe ser mayor a cero.';
  } else if (datos.montoCentavos > MAXIMO_CENTAVOS) {
    errores.montoCentavos = 'El monto es demasiado grande.';
  }

  if (!Number.isInteger(datos.diaCobro) || datos.diaCobro < 1 || datos.diaCobro > 31) {
    errores.diaCobro = 'El día debe estar entre 1 y 31.';
  }

  if (!datos.categoria) errores.categoria = 'Elige una categoría.';

  return Object.keys(errores).length > 0
    ? { ok: false, errores }
    : { ok: true, datos: { ...datos, nombre } };
}

/**
 * La próxima fecha de cobro: la primera de ese día del mes que sea de hoy en
 * adelante y posterior a `cobradaHasta` (lo ya atendido no vuelve a cobrarse).
 */
export function proximoCobro(
  diaCobro: number,
  hoy: FechaIso,
  cobradaHasta: FechaIso | null = null,
): FechaIso {
  const base = deFechaIso(hoy);
  for (let meses = 0; meses < 14; meses += 1) {
    const mes = new Date(base.getFullYear(), base.getMonth() + meses, 1);
    const fecha = fechaDeCobro(mes.getFullYear(), mes.getMonth(), diaCobro);
    if (fecha >= hoy && (cobradaHasta === null || fecha > cobradaHasta)) return fecha;
  }
  return sumarDias(hoy, 31);
}

/** `cobrada_hasta` de una suscripción nueva: hoy, o ayer si también se cobra la de hoy. */
export function cobradaHastaAlCrear(hoy: FechaIso, cobrarHoy: boolean): FechaIso {
  return cobrarHoy ? sumarDias(hoy, -1) : hoy;
}

/** ¿Hoy es el día de cobro? (En meses cortos, el último día cuenta como el 31.) */
export function esDiaDeCobro(diaCobro: number, hoy: FechaIso): boolean {
  const fecha = deFechaIso(hoy);
  const dia = Math.min(diaCobro, ultimoDiaDelMes(fecha.getFullYear(), fecha.getMonth()));
  return fecha.getDate() === dia;
}
