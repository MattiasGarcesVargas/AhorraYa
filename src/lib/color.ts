/** Luminancia relativa WCAG de un color `#RRGGBB`. */
export function luminancia(hex: string): number {
  const limpio = hex.replace('#', '');
  const canales = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Blanco o casi negro, el que más contraste dé sobre `fondo`. Las categorías
 * van de verde bosque a verde menta: un icono de color fijo se perdería en la
 * mitad de ellas.
 */
export function colorLegibleSobre(fondo: string, claro = '#FFFFFF', oscuro = '#0A0F0C'): string {
  return contraste(fondo, claro) >= contraste(fondo, oscuro) ? claro : oscuro;
}
