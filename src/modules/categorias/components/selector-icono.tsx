import { Pressable, View } from 'react-native';

import { Icono } from '@/components/ui';
import { ICONOS_CATEGORIA, type NombreIcono } from '@/constants/categorias.constants';
import { hapticos } from '@/lib/hapticos';

export interface SelectorIconoProps {
  valor: NombreIcono;
  alCambiar: (icono: NombreIcono) => void;
}

export function SelectorIcono({ valor, alCambiar }: SelectorIconoProps) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {ICONOS_CATEGORIA.map((icono) => {
        const activo = icono === valor;
        return (
          <Pressable
            key={icono}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
            accessibilityLabel={icono.replace('-outline', '').replace(/-/g, ' ')}
            onPress={() => {
              hapticos.seleccion();
              alCambiar(icono);
            }}
            className={`h-12 w-12 items-center justify-center rounded-lg active:opacity-80 ${
              activo ? 'bg-seleccion' : 'bg-superficie'
            }`}
          >
            <Icono nombre={icono} tamano={22} color={activo ? 'seleccion-icono' : 'texto-suave'} />
          </Pressable>
        );
      })}
    </View>
  );
}
