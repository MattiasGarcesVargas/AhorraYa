import { Platform } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

/**
 * Si la barra de pestañas la dibuja el sistema (iOS con Liquid Glass) o la
 * app. Se decide UNA vez al cargar: el sistema no cambia de diseño en caliente.
 * El `try` cubre un binario sin el módulo nativo de `expo-glass-effect`.
 */
export const USA_PESTANAS_NATIVAS = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
})();

/** Margen lateral de todas las pantallas. */
export const MARGEN_PANTALLA = 20;

/**
 * Aire al final de cada pantalla con pestañas. La barra nativa de iOS 26
 * FLOTA sobre el contenido y su alto no se puede medir desde JavaScript
 * (lo documenta expo-router), así que es un valor fijo; la barra propia ya
 * ocupa su franja y sólo hace falta el aire de cierre.
 */
export const ESPACIO_FINAL_PESTANAS = USA_PESTANAS_NATIVAS ? 120 : 32;
