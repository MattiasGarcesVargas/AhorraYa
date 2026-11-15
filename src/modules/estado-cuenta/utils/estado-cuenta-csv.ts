import type { Centavos } from '@/lib/dinero';
import { formatFechaNumerica } from '@/lib/fechas';

import type { EstadoCuenta, LineaCuenta } from '../estado-cuenta.types';

const TIPO: Record<LineaCuenta['tipo'], string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  aporte: 'Aporte al ahorro',
  retiro: 'Retiro del ahorro',
};

/** Campo CSV (RFC 4180): entre comillas si trae coma, comillas o salto de línea. */
export function campoCsv(valor: string): string {
  return /[",\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** Importe como número plano con punto decimal (`-4.50`), sin `$` ni miles: así Excel lo suma. */
function numero(centavos: Centavos): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${signo}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

/**
 * Los movimientos del mes en CSV, una fila por movimiento, para abrirlos en
 * Excel o Numbers. Empieza con BOM UTF-8: sin él, Excel muestra mal las tildes.
 */
export function estadoCuentaCsv(e: EstadoCuenta): string {
  const filas = [
    ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Forma de pago', 'Monto'],
    ...e.movimientos.map((l) => [
      formatFechaNumerica(l.fecha),
      TIPO[l.tipo],
      l.concepto,
      l.categoria ?? '',
      l.metodo ?? '',
      numero(l.monto),
    ]),
  ];
  return `\uFEFF${filas.map((fila) => fila.map(campoCsv).join(',')).join('\r\n')}\r\n`;
}
