import { deFechaIso, type FechaIso } from '@/lib/fechas';
import { registrarGasto, type ReposRegistro } from '@/modules/gastos/services/registrar-gasto';

import { fechaDeCobro } from '../utils/fecha-de-cobro';
import type { SuscripcionesRepository } from './suscripciones.repository';

/** Tope por si la app pasa meses sin abrirse: no se cobran años de golpe. */
const MAXIMO_COBROS = 12;

/** Cada cobro mensual después de `cobradaHasta` (sin contarlo) y hasta `hoy` (contándolo). */
export function cobrosPendientes(
  diaCobro: number,
  cobradaHasta: FechaIso,
  hoy: FechaIso,
): FechaIso[] {
  const desde = deFechaIso(cobradaHasta);
  const hasta = deFechaIso(hoy);
  const cobros: FechaIso[] = [];

  let anio = desde.getFullYear();
  let mes = desde.getMonth();
  while (anio < hasta.getFullYear() || (anio === hasta.getFullYear() && mes <= hasta.getMonth())) {
    const fecha = fechaDeCobro(anio, mes, diaCobro);
    if (fecha > cobradaHasta && fecha <= hoy) cobros.push(fecha);
    mes += 1;
    if (mes > 11) {
      mes = 0;
      anio += 1;
    }
  }
  return cobros.slice(-MAXIMO_COBROS);
}

export interface ReposCobro extends ReposRegistro {
  suscripciones: SuscripcionesRepository;
}

/**
 * Registra como gastos los cobros de las suscripciones activas que ya
 * llegaron, cada uno con la fecha de su día de cobro, y avanza la marca hasta
 * hoy para no repetirlos. Pasa por `registrarGasto`, así que una app del
 * exterior pagada con tarjeta también crea su IVA y su ISD.
 *
 * Son gastos normales: se pueden corregir o eliminar. Devuelve cuántos
 * cobros registró. Quien llama lo envuelve en una transacción.
 */
export async function cobrarSuscripciones(repos: ReposCobro, hoy: FechaIso): Promise<number> {
  let registrados = 0;

  for (const suscripcion of await repos.suscripciones.listar()) {
    if (!suscripcion.activa || suscripcion.cobradaHasta >= hoy) continue;

    const fechas = cobrosPendientes(suscripcion.diaCobro, suscripcion.cobradaHasta, hoy);
    for (const fecha of fechas) {
      await registrarGasto(repos, {
        montoCentavos: suscripcion.montoCentavos,
        categoria: suscripcion.categoria,
        metodoPago: suscripcion.metodoPago,
        // Ya viene resuelta del formulario (cuenta del banco, billetera o ninguna).
        cuentaId: suscripcion.cuentaId,
        nota: suscripcion.nombre,
        fecha,
        origen: 'suscripcion',
      });
    }
    registrados += fechas.length;
    await repos.suscripciones.marcarCobradaHasta(suscripcion.id, hoy);
  }
  return registrados;
}
