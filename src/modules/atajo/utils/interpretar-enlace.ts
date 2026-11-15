import { METODOS_PAGO, type MetodoPagoId } from '@/constants/metodos-pago.constants';
import { interpretarImporte } from '@/lib/dinero';
import type { FechaIso } from '@/lib/fechas';
import { normalizar } from '@/lib/texto';
import type { CatalogoCategorias } from '@/modules/categorias/categorias.types';
import type { Cuenta } from '@/modules/cuentas/cuentas.types';
import type { BorradorGasto, NuevoGasto } from '@/modules/gastos/gastos.types';
import { LARGO_MAXIMO_NOTA } from '@/modules/gastos/schema/gasto.schema';
import {
  billeteraDe,
  cuentaDelGasto,
  cuentasDeBanco,
  tocaCuenta,
} from '@/modules/gastos/utils/cuenta-del-gasto';

/** Lo que entrega `useLocalSearchParams` de expo-router. */
export type ParametrosEnlace = Record<string, string | string[] | undefined>;

export type ResultadoEnlace =
  | {
      tipo: 'completo';
      gasto: NuevoGasto;
      /**
       * `true` si antes de guardar hay que preguntar de qué cuenta sale: se
       * pagó con débito o transferencia, hay más de una cuenta y el enlace no
       * dijo cuál. `gasto.cuentaId` trae la del día a día como sugerencia.
       */
      cuentaPorElegir: boolean;
    }
  | { tipo: 'incompleto'; borrador: BorradorGasto };

/**
 * Nombres admitidos para cada dato. Se aceptan varios porque el atajo lo arma
 * una persona en la app Atajos y es fácil escribir `cantidad` en vez de
 * `monto`; cuanto más perdone el enlace, menos se rompe el atajo.
 */
const CLAVES = {
  monto: ['monto', 'cantidad', 'importe', 'valor', 'm'],
  categoria: ['categoria', 'cat', 'c'],
  metodo: ['metodo', 'pago', 'forma', 'forma_pago', 'p'],
  nota: ['nota', 'descripcion', 'comercio', 'comerciante', 'n'],
  origen: ['origen', 'o'],
  cuenta: ['cuenta', 'desde', 'cta'],
} as const;

/** Valores de `origen` que marcan un pago con Apple Pay (la automatización de Wallet). */
const ORIGENES_WALLET = ['wallet', 'apple pay', 'applepay', 'apple-pay', 'tarjeta'];

/** Lo que el enlace no trae y hay que saber de la app para completarlo. */
export interface ContextoEnlace {
  /** La cuenta del día a día: de ahí salen los pagos con débito o transferencia. */
  cuentaDiariaId?: number | null;
  /** Categoría por defecto de los pagos con Apple Pay, que llegan sin categoría. */
  categoriaWallet?: string | null;
  /** Las cuentas registradas, para reconocer `cuenta=` y saber si hay que preguntar. */
  cuentas?: readonly CuentaEnlace[];
}

type CuentaEnlace = Pick<Cuenta, 'id' | 'nombre' | 'tipo'> & { orden?: number };

/** Formas de nombrar una cuenta por su tipo, sin escribir el nombre exacto. */
const ALIAS_TIPO_CUENTA: Readonly<Record<Cuenta['tipo'], readonly string[]>> = {
  diaria: ['diaria', 'ahorros', 'debito', 'dia a dia'],
  flexible: ['flexible', 'ahorro', 'flex'],
  efectivo: ['efectivo', 'billetera', 'cash'],
};

function leer(params: ParametrosEnlace, claves: readonly string[]): string | undefined {
  for (const clave of claves) {
    const valor = params[clave];
    const texto = Array.isArray(valor) ? valor[0] : valor;
    if (texto != null && texto.trim() !== '') return texto.trim();
  }
  return undefined;
}

function coincide(texto: string, opcion: { id: string; nombre: string; alias: readonly string[] }) {
  const buscado = normalizar(texto);
  return [opcion.id, opcion.nombre, ...opcion.alias].some(
    (candidato) => normalizar(candidato) === buscado,
  );
}

/** "Débito", "debito", "Tarjeta de débito" → `debito`. */
export function buscarMetodoPago(texto: string | undefined): MetodoPagoId | undefined {
  if (!texto) return undefined;
  return METODOS_PAGO.find((metodo) => coincide(texto, metodo))?.id;
}

/** "Cuenta flexible", "flexible", "FLEX" → esa cuenta. Primero por nombre, luego por tipo. */
export function buscarCuenta(
  texto: string | undefined,
  cuentas: readonly CuentaEnlace[] = [],
): CuentaEnlace | undefined {
  if (!texto) return undefined;
  const buscado = normalizar(texto);
  return (
    cuentas.find((cuenta) => normalizar(cuenta.nombre) === buscado) ??
    cuentas.find((cuenta) => ALIAS_TIPO_CUENTA[cuenta.tipo].includes(buscado))
  );
}

/** ¿El enlace viene de la automatización de Wallet (un pago con Apple Pay)? */
export function esEnlaceWallet(params: ParametrosEnlace): boolean {
  const origen = leer(params, CLAVES.origen);
  return origen !== undefined && ORIGENES_WALLET.includes(normalizar(origen));
}

/**
 * La categoría de un pago con Apple Pay: la elegida en la app si todavía
 * existe; si no, la primera de la lista. Nunca una que ya se eliminó.
 */
function categoriaDeWallet(
  categorias: CatalogoCategorias,
  preferida: string | null | undefined,
): string | undefined {
  const existe = categorias.lista.some((categoria) => categoria.id === preferida);
  return existe ? (preferida ?? undefined) : categorias.lista[0]?.id;
}

/**
 * Lo que se pueda rescatar del enlace, aunque falten datos. Las categorías
 * llegan como parámetro (son las que la persona creó), así que una categoría
 * nueva funciona en el atajo sin tocar código.
 *
 * Un pago con Apple Pay (`origen=wallet`) sólo sabe el importe y el comercio:
 * la categoría se toma de la preferencia y la forma de pago es débito.
 */
export function leerBorrador(
  params: ParametrosEnlace,
  categorias: CatalogoCategorias,
  contexto: ContextoEnlace = {},
): BorradorGasto {
  const montoCentavos = interpretarImporte(leer(params, CLAVES.monto)) ?? undefined;
  const nota = leer(params, CLAVES.nota)?.slice(0, LARGO_MAXIMO_NOTA);
  const categoria = categorias.buscar(leer(params, CLAVES.categoria))?.id;
  const metodoPago = buscarMetodoPago(leer(params, CLAVES.metodo));
  const cuentaId = buscarCuenta(leer(params, CLAVES.cuenta), contexto.cuentas)?.id;

  if (esEnlaceWallet(params)) {
    return {
      montoCentavos,
      categoria: categoria ?? categoriaDeWallet(categorias, contexto.categoriaWallet),
      metodoPago: metodoPago ?? 'debito',
      nota,
      cuentaId,
    };
  }
  return { montoCentavos, categoria, metodoPago, nota, cuentaId };
}

/**
 * Decide qué hacer con un enlace `ahorraya://registrar?...`:
 *  - con importe, categoría y forma de pago válidos → se registra directo;
 *  - si falta o no se entiende algo → se abre el formulario con lo que sí
 *    llegó, para completarlo a mano. Nunca se descarta un gasto en silencio.
 *
 * La cuenta: la que diga el enlace (`cuenta=Flexible`); si no dice y hay
 * varias, se marca `cuentaPorElegir` para que la app la pregunte. Un pago con
 * Apple Pay no pregunta: sale de la cuenta de la tarjeta (la del día a día).
 */
export function interpretarEnlaceGasto(
  params: ParametrosEnlace,
  hoy: FechaIso,
  categorias: CatalogoCategorias,
  contexto: ContextoEnlace = {},
): ResultadoEnlace {
  const borrador = leerBorrador(params, categorias, contexto);
  const { montoCentavos, categoria, metodoPago } = borrador;

  if (montoCentavos && categoria && metodoPago) {
    const deWallet = esEnlaceWallet(params);
    const cuentaId = borrador.cuentaId ?? contexto.cuentaDiariaId ?? null;
    const cuentas = (contexto.cuentas ?? []).map((c) => ({ ...c, orden: c.orden ?? 0 }));
    const billetera = billeteraDe(cuentas);
    return {
      tipo: 'completo',
      gasto: {
        montoCentavos,
        categoria,
        metodoPago,
        cuentaId: cuentaDelGasto(metodoPago, cuentaId, billetera),
        nota: borrador.nota ?? null,
        fecha: hoy,
        origen: deWallet ? 'wallet' : 'atajo',
      },
      cuentaPorElegir:
        !deWallet &&
        tocaCuenta(metodoPago) &&
        borrador.cuentaId === undefined &&
        cuentasDeBanco(cuentas).length > 1,
    };
  }
  return { tipo: 'incompleto', borrador };
}

/** El camino inverso: un borrador como parámetros de ruta (para abrir el formulario prellenado). */
export function borradorAParametros(borrador: BorradorGasto): Record<string, string> {
  const params: Record<string, string> = {};
  if (borrador.montoCentavos) params.monto = (borrador.montoCentavos / 100).toFixed(2);
  if (borrador.categoria) params.categoria = borrador.categoria;
  if (borrador.metodoPago) params.metodo = borrador.metodoPago;
  if (borrador.nota) params.nota = borrador.nota;
  if (borrador.cuentaId) params.cuenta = String(borrador.cuentaId);
  return params;
}

/** Un texto que todavía trae el `[hueco]` de la plantilla: falta poner la variable. */
function esHueco(texto: string): boolean {
  return /^\[.*\]$/.test(texto.trim());
}

/**
 * Por qué un enlace del atajo no se pudo registrar solo, en palabras que
 * ayuden a arreglar el atajo. Vacío si no le falta nada.
 */
export function diagnosticarEnlace(
  params: ParametrosEnlace,
  categorias: CatalogoCategorias,
  cuentas: readonly CuentaEnlace[] = [],
): string[] {
  const problemas: string[] = [];
  const monto = leer(params, CLAVES.monto);
  const categoria = leer(params, CLAVES.categoria);
  const metodo = leer(params, CLAVES.metodo);

  if (!monto && !categoria && !metodo) {
    return [
      'El enlace llegó sin datos. Revisa que la acción "Abrir URL" use la URL armada con monto, categoría y pago.',
    ];
  }

  const revisar = (
    valor: string | undefined,
    nombre: string,
    variable: string,
    valido: (texto: string) => boolean,
    noExiste: string,
  ) => {
    if (!valor) problemas.push(`No llegó ${nombre}.`);
    else if (esHueco(valor))
      problemas.push(
        `${nombre[0].toUpperCase()}${nombre.slice(1)} llegó como "${valor}": en el atajo cambia ese texto por la variable ${variable}.`,
      );
    else if (!valido(valor)) problemas.push(noExiste.replace('{}', valor));
  };

  revisar(
    monto,
    'el importe',
    '"Entrada proporcionada"',
    (t) => !!interpretarImporte(t),
    'El importe "{}" no es un número.',
  );
  revisar(
    categoria,
    'la categoría',
    '"Elemento elegido" (el primero)',
    (t) => !!categorias.buscar(t),
    'La categoría "{}" no existe en AhorraYa. Escríbela igual que en la app.',
  );
  revisar(
    metodo,
    'la forma de pago',
    '"Elemento elegido" (el segundo)',
    (t) => !!buscarMetodoPago(t),
    'La forma de pago "{}" no se reconoce. Usa Efectivo, Debito, Credito o Transferencia.',
  );

  // La cuenta es opcional: sólo se avisa si vino y no se reconoce.
  const cuenta = leer(params, CLAVES.cuenta);
  if (cuenta && !buscarCuenta(cuenta, cuentas)) {
    problemas.push(`La cuenta "${cuenta}" no existe en AhorraYa. Escríbela igual que en la app.`);
  }
  return problemas;
}
