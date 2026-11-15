import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Vibraciones con significado: `seleccion` al tocar una opción, `exito` al
 * registrar, `aviso` al borrar. Envueltas aquí para que las pantallas no
 * dependan de expo-haptics y para no llamarlo en web, donde no existe.
 */
const disponible = Platform.OS === 'ios' || Platform.OS === 'android';

function seguro(accion: () => Promise<void>) {
  if (!disponible) return;
  accion().catch(() => {
    /* sin motor háptico (simulador, ahorro de batería): no pasa nada */
  });
}

export const hapticos = {
  seleccion: () => seguro(() => Haptics.selectionAsync()),
  tecla: () => seguro(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  exito: () => seguro(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  aviso: () => seguro(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
