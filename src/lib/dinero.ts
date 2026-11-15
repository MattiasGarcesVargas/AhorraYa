/**
 * Todo importe del dominio viaja en CENTAVOS enteros.
 *
 * Con decimales en coma flotante 0.1 + 0.2 da 0.30000000000000004, y sumar
 * cientos de gastos de $0.35 acaba descuadrando el saldo por un centavo. Con
 * enteros la suma es exacta; los decimales sólo aparecen al mostrar.
 */
export type Centavos = number;

/** Tope de un movimiento: $1,000,000.00. Cualquier cosa por encima es un error de tecleo. */
export const MAXIMO_CENTAVOS: Centavos = 100_000_000;

export function aCentavos(unidades: number): Centavos {
  if (!Number.isFinite(unidades)) return 0;
  // `Number(`${x}e2`)` escala sobre la representación DECIMAL del número, no
  // la binaria: 1.005 * 100 da 100.49999… y redondearía mal.
  return Math.round(Number(`${unidades}e2`));
}

export function aUnidades(centavos: Centavos): number {
  return centavos / 100;
}

/**
 * Una parte de un importe, en puntos básicos (1500 = 15 %), redondeada al
 * centavo. Trabaja con enteros: 231 × 1500 / 10000 = 34,65 → 35.
 */
export function porcionBp(centavos: Centavos, bp: number): Centavos {
  return Math.round((centavos * bp) / 10_000);
}

export function sumar(importes: readonly Centavos[]): Centavos {
  return importes.reduce((total, importe) => total + importe, 0);
}

/** Símbolo o código de moneda pegado al número: `$`, `US$`, `USD`. */
const MONEDA = /^(us\$|usd|\$)|(usd|\$)$/gi;

/** Quita espacios (también los "duros" que pone iOS) y la moneda de un importe escrito. */
function sinMoneda(texto: string): string {
  return texto.replace(/[\s\u00a0\u202f]/g, '').replace(MONEDA, '');
}

/**
 * Interpreta un importe escrito por una persona o por el atajo de iPhone:
 * `12.50`, `12,50`, `$12.50`, `1,234.50`, `1.234,50`. También como lo manda
 * Wallet al pagar con Apple Pay: `US$ 4.50`, `4,50 USD`.
 *
 * Regla para el separador: si aparecen los dos, el ÚLTIMO es el decimal. Si
 * sólo hay comas y forman grupos de tres (`1,234`), son miles; si no
 * (`12,5`), es decimal — así llega un número desde Atajos con el teléfono en
 * español.
 */
export function interpretarImporte(texto: string | null | undefined): Centavos | null {
  if (texto == null) return null;

  const limpio = sinMoneda(String(texto));
  if (!/^\d[\d.,]*$/.test(limpio)) return null;

  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');
  let normalizado: string;

  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    const decimal = ultimaComa > ultimoPunto ? ',' : '.';
    const miles = decimal === ',' ? '.' : ',';
    normalizado = limpio.split(miles).join('').replace(decimal, '.');
  } else if (ultimaComa >= 0) {
    normalizado = /^\d{1,3}(,\d{3})+$/.test(limpio)
      ? limpio.split(',').join('')
      : limpio.replace(',', '.');
  } else {
    normalizado = /^\d{1,3}(\.\d{3}){2,}$/.test(limpio) ? limpio.split('.').join('') : limpio;
  }

  if ((normalizado.match(/\./g) ?? []).length > 1) return null;

  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor <= 0) return null;

  const centavos = aCentavos(valor);
  return centavos > 0 && centavos <= MAXIMO_CENTAVOS ? centavos : null;
}

/**
 * Como `interpretarImporte`, pero el cero (o el campo vacío) es válido: un
 * límite de presupuesto en $0 quiere decir "esta categoría no tiene tope".
 */
export function interpretarImporteOCero(texto: string | null | undefined): Centavos | null {
  const limpio = sinMoneda(texto ?? '');
  if (limpio === '' || /^0+([.,]0*)?$/.test(limpio)) return 0;
  return interpretarImporte(limpio);
}

/** Porcentaje de `parte` sobre `total`, sin dividir por cero. */
export function porcentaje(parte: Centavos, total: Centavos): number {
  if (total <= 0) return parte > 0 ? 100 : 0;
  return (parte / total) * 100;
}
