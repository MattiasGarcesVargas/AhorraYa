import { View } from 'react-native';

import { Texto } from '@/components/ui';

export interface Paso {
  titulo: string;
  detalle: string;
}

/** Pasos numerados de una guía. */
export function ListaPasos({ pasos }: { pasos: readonly Paso[] }) {
  return (
    <View className="gap-4">
      {pasos.map((paso, i) => (
        <View key={paso.titulo} className="flex-row gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-superficie">
            <Texto variante="mini" numerico>
              {i + 1}
            </Texto>
          </View>
          <View className="flex-1">
            <Texto peso="semibold">{paso.titulo}</Texto>
            <Texto variante="detalle" tono="suave">
              {paso.detalle}
            </Texto>
          </View>
        </View>
      ))}
    </View>
  );
}
