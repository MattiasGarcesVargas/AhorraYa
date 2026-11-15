import { Alert } from 'react-native';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje?: string;
  textoConfirmar?: string;
  destructivo?: boolean;
}

/**
 * Pregunta antes de una acción irreversible. Devuelve una promesa para que
 * quien la llama escriba `if (await confirmar(...))` en vez de anidar
 * callbacks. En web hay una versión propia (`confirmar.web.ts`) porque
 * `Alert.alert` con botones no hace nada en el navegador.
 */
export function confirmar({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  destructivo = false,
}: OpcionesConfirmacion): Promise<boolean> {
  return new Promise((resolver) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      {
        text: textoConfirmar,
        style: destructivo ? 'destructive' : 'default',
        onPress: () => resolver(true),
      },
    ]);
  });
}
