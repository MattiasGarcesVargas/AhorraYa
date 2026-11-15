import type { Centavos } from '@/lib/dinero';
import { deFechaIso, sumarDias, type FechaIso } from '@/lib/fechas';

import type { IngresosRepository } from './ingresos.repository';

const LUNES = 1;
/** Tope por si la app pasa meses sin abrirse: no se acreditan años de golpe. */
const MAXIMO_LUNES = 12;

/** Los lunes después de `desde` (sin contarlo) y hasta `hoy` (contándolo). */
export function lunesPendientes(desde: FechaIso, hoy: FechaIso): FechaIso[] {
  const lunes: FechaIso[] = [];
  for (let fecha = sumarDias(desde, 1); fecha <= hoy; fecha = sumarDias(fecha, 1)) {
    if (deFechaIso(fecha).getDay() === LUNES) lunes.push(fecha);
  }
  return lunes.slice(-MAXIMO_LUNES);
}

/**
 * La mesada llega todos los lunes a la cuenta del día a día: en vez de
 * anotarla a mano, se acredita sola. Al abrir la app se registran como
 * ingresos los lunes que pasaron desde la última vez, cada uno con su fecha.
 *
 * Son ingresos normales: se pueden corregir o eliminar (si un lunes no llegó),
 * y no vuelven a aparecer porque la marca ya avanzó. Devuelve cuántos anotó.
 * Quien llama lo envuelve en una transacción.
 */
export async function acreditarMesadas(
  ingresos: IngresosRepository,
  datos: { mesadaCentavos: Centavos; cuentaId: number | null; hoy: FechaIso },
): Promise<number> {
  const hasta = await ingresos.mesadaAcreditadaHasta();
  if (hasta !== null && hasta >= datos.hoy) return 0;

  // Sin marca (primera vez) o con la mesada en 0 no se anota nada: sólo se avanza.
  const pendientes =
    hasta === null || datos.mesadaCentavos <= 0 ? [] : lunesPendientes(hasta, datos.hoy);

  for (const fecha of pendientes) {
    await ingresos.registrar({
      montoCentavos: datos.mesadaCentavos,
      tipo: 'mesada',
      cuentaId: datos.cuentaId,
      nota: 'Mesada de la semana',
      fecha,
    });
  }
  await ingresos.marcarMesadaAcreditada(datos.hoy);
  return pendientes.length;
}
