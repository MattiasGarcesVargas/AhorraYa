import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MARGEN_PANTALLA } from '@/constants/layout.constants';

import { BotonIcono, Texto } from './ui';

export interface EncabezadoProps {
  titulo: string;
  /**
   * `hoja`: modal que sube desde abajo → botón de cerrar a la derecha, sin
   *  margen superior (iOS ya lo separa del borde).
   * `pila`: pantalla empujada → flecha atrás a la izquierda, bajo la isla.
   */
  variante: 'hoja' | 'pila';
}

export function Encabezado({ titulo, variante }: EncabezadoProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (variante === 'hoja') {
    return (
      <View
        className="flex-row items-center justify-between pb-2 pt-4"
        style={{ paddingHorizontal: MARGEN_PANTALLA }}
      >
        <Texto variante="subtitulo" accessibilityRole="header">
          {titulo}
        </Texto>
        <BotonIcono icono="close" etiqueta="Cerrar" onPress={volver} />
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center gap-2 pb-2"
      style={{ paddingTop: insets.top + 4, paddingHorizontal: MARGEN_PANTALLA - 8 }}
    >
      <BotonIcono icono="chevron-back" etiqueta="Volver" variante="fantasma" onPress={volver} />
      <Texto variante="subtitulo" accessibilityRole="header">
        {titulo}
      </Texto>
    </View>
  );
}
