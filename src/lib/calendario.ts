import { aFechaIso, deFechaIso, ultimoDiaDelMes, type FechaIso } from './fechas';

/** El primer día del mes de una fecha. */
export function inicioDeMes(fecha: FechaIso): FechaIso {
  return `${fecha.slice(0, 7)}-01`;
}

/** El primer día del mes anterior (`-1`) o siguiente (`+1`). */
export function moverMes(mes: FechaIso, pasos: number): FechaIso {
  const base = deFechaIso(inicioDeMes(mes));
  return aFechaIso(new Date(base.getFullYear(), base.getMonth() + pasos, 1));
}

/**
 * Las semanas de un mes para pintar un calendario, de lunes a domingo. Los
 * huecos antes del día 1 y después del último van como `null`.
 */
export function semanasDelMes(mes: FechaIso): (FechaIso | null)[][] {
  const primero = deFechaIso(inicioDeMes(mes));
  const anio = primero.getFullYear();
  const indice = primero.getMonth();
  // getDay(): domingo = 0. Con lunes como primera columna, domingo pasa a 6.
  const huecos = (primero.getDay() + 6) % 7;

  const celdas: (FechaIso | null)[] = Array.from({ length: huecos }, () => null);
  for (let dia = 1; dia <= ultimoDiaDelMes(anio, indice); dia++) {
    celdas.push(aFechaIso(new Date(anio, indice, dia)));
  }
  while (celdas.length % 7 !== 0) celdas.push(null);

  const semanas: (FechaIso | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}
