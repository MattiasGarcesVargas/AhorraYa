import * as Linking from 'expo-linking';

export const RUTA_REGISTRAR = 'registrar';
export const RUTA_NUEVO_GASTO = 'nuevo-gasto';

/**
 * Base del enlace según dónde corre la app. Con la app instalada es
 * `ahorraya://registrar`; en Expo Go es `exp://<ip>:8081/--/registrar`. Se
 * calcula en vez de escribirse a mano para que la guía del atajo muestre
 * SIEMPRE la dirección que funciona en este teléfono.
 */
export function enlaceRegistrar(parametros?: Record<string, string>): string {
  return Linking.createURL(RUTA_REGISTRAR, parametros ? { queryParams: parametros } : undefined);
}

export function enlaceNuevoGasto(): string {
  return Linking.createURL(RUTA_NUEVO_GASTO);
}

/** La plantilla que se pega en la acción "URL" de Atajos, con los huecos marcados. */
export function plantillaAtajo(): string {
  return `${enlaceRegistrar()}?monto=[Cuánto]&categoria=[Categoría]&metodo=[Pago]`;
}

/**
 * La plantilla de la automatización de Wallet: un pago con Apple Pay sólo sabe
 * el importe y el comercio. La categoría la pone la app (la de por defecto).
 */
export function plantillaWallet(): string {
  return `${enlaceRegistrar()}?origen=wallet&monto=[Importe]&nota=[Comercio]`;
}
