/**
 * Formatos que se muestran en pantalla.
 *
 * ─── REGLA GENERAL ───────────────────────────────────────────────────────────
 * Coma para los miles, punto para los decimales: `$ 1,234.50`. Es la misma
 * regla que el resto de mis proyectos. Ninguna pantalla crea su propio
 * `Intl.NumberFormat` ni llama a `toLocaleString`: todo sale de aquí.
 *
 * Los importes ENTRAN en centavos (ver `dinero.ts`).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Centavos } from './dinero';

const MILES = /\B(?=(\d{3})+(?!\d))/g;

/** Partes de un importe, para pintar los centavos más pequeños que el entero. */
export function partesImporte(centavos: Centavos): {
  signo: string;
  entero: string;
  decimales: string;
} {
  const absoluto = Math.abs(Math.round(centavos));
  const entero = Math.floor(absoluto / 100)
    .toString()
    .replace(MILES, ',');
  const decimales = (absoluto % 100).toString().padStart(2, '0');

  return { signo: centavos < 0 ? '-' : '', entero, decimales };
}

/** `$ 1,234.50`. El espacio tras el `$` separa el símbolo del primer dígito. */
export function formatMoneda(centavos: Centavos): string {
  const { signo, entero, decimales } = partesImporte(centavos);
  return `${signo}$ ${entero}.${decimales}`;
}

/** `$ 1,234` sin centavos, para cifras redondas como metas y límites. */
export function formatMonedaEntera(centavos: Centavos): string {
  const { signo, entero, decimales } = partesImporte(centavos);
  return decimales === '00' ? `${signo}$ ${entero}` : formatMoneda(centavos);
}

/** Importe con signo explícito para listas de movimientos: `+$ 350.00`, `-$ 4.50`. */
export function formatMonedaConSigno(centavos: Centavos): string {
  if (centavos === 0) return formatMoneda(0);
  const { entero, decimales } = partesImporte(centavos);
  return `${centavos > 0 ? '+' : '-'}$ ${entero}.${decimales}`;
}

/** `34%`. Sin decimales: en un presupuesto personal nadie decide por un 0.3 %. */
export function formatPorcentaje(valor: number): string {
  if (!Number.isFinite(valor)) return '—';
  return `${Math.round(valor)}%`;
}
