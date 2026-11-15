import { MAXIMO_CENTAVOS, type Centavos } from './dinero';

/**
 * Lógica del teclado numérico propio, separada del componente para poder
 * probarla sin pantalla.
 *
 * La entrada es el TEXTO que la persona va escribiendo (`"12."`, `"12.5"`):
 * guardarla como número perdería el punto final y el cero de `"12.50"` mientras
 * se escribe.
 */
export type Tecla = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'borrar';

const MAX_DIGITOS_ENTEROS = 7;
const MAX_DECIMALES = 2;

export function pulsarTecla(entrada: string, tecla: Tecla): string {
  if (tecla === 'borrar') return entrada.slice(0, -1);

  if (tecla === '.') {
    if (entrada.includes('.')) return entrada;
    return entrada === '' ? '0.' : `${entrada}.`;
  }

  const [entero, decimales] = entrada.split('.');

  if (decimales !== undefined) {
    return decimales.length >= MAX_DECIMALES ? entrada : `${entrada}${tecla}`;
  }

  // Un cero a la izquierda no aporta nada: "0" + "5" es "5".
  if (entero === '0') return tecla;
  if (entero.length >= MAX_DIGITOS_ENTEROS) return entrada;

  const siguiente = `${entrada}${tecla}`;
  return entradaACentavos(siguiente) > MAXIMO_CENTAVOS ? entrada : siguiente;
}

export function entradaACentavos(entrada: string): Centavos {
  if (entrada === '' || entrada === '.') return 0;
  const [entero, decimales = ''] = entrada.split('.');
  const centavos = Number(entero || '0') * 100 + Number(decimales.padEnd(2, '0').slice(0, 2));
  return Number.isFinite(centavos) ? centavos : 0;
}

/** El camino inverso, para abrir el teclado con un valor ya cargado. */
export function centavosAEntrada(centavos: Centavos): string {
  if (centavos <= 0) return '';
  const entero = Math.floor(centavos / 100);
  const resto = centavos % 100;
  if (resto === 0) return String(entero);
  return `${entero}.${String(resto).padStart(2, '0').replace(/0$/, '')}`;
}
