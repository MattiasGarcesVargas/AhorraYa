import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { COLORES_CATEGORIA, type ColorCategoria } from '@/constants/categorias.constants';
import { colorLegibleSobre } from '@/lib/color';
import { hapticos } from '@/lib/hapticos';
import { useTema } from '@/providers/tema-provider';

export interface SelectorColorProps {
  valor: ColorCategoria;
  alCambiar: (color: ColorCategoria) => void;
}

/** Muestras de la escala de verdes. La elegida lleva aro y check: no se marca sólo con color. */
export function SelectorColor({ valor, alCambiar }: SelectorColorProps) {
  const { colores } = useTema();

  return (
    <View className="flex-row flex-wrap gap-3" accessibilityRole="radiogroup">
      {COLORES_CATEGORIA.map((color, i) => {
        const activo = color === valor;
        const fondo = colores[color];
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
            accessibilityLabel={`Tono ${i + 1}`}
            hitSlop={4}
            onPress={() => {
              hapticos.seleccion();
              alCambiar(color);
            }}
            className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
              activo ? 'border-texto' : 'border-transparent'
            }`}
          >
            <View
              style={{ backgroundColor: fondo }}
              className="h-9 w-9 items-center justify-center rounded-full"
            >
              {activo ? (
                <Ionicons name="checkmark" size={18} color={colorLegibleSobre(fondo)} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
