import { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Icono, Superficie, Texto } from '@/components/ui';
import { FUENTES } from '@/constants/tema.constants';
import { hapticos } from '@/lib/hapticos';

/** Un texto para pegar en Atajos (una URL, una plantilla): se copia con un toque. */
export function BloqueCopiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    await Clipboard.setStringAsync(valor);
    hapticos.seleccion();
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copiar ${etiqueta}`}
      onPress={copiar}
      className="active:opacity-80"
    >
      <Superficie className="gap-2">
        <View className="flex-row items-center justify-between">
          <Texto variante="mini" tono="suave">
            {etiqueta}
          </Texto>
          <View className="flex-row items-center gap-1">
            <Icono nombre={copiado ? 'checkmark' : 'copy-outline'} tamano={14} color="primario" />
            <Texto variante="mini" tono="primario">
              {copiado ? 'Copiado' : 'Copiar'}
            </Texto>
          </View>
        </View>
        <Texto variante="detalle" selectable style={{ fontFamily: FUENTES.medium }}>
          {valor}
        </Texto>
      </Superficie>
    </Pressable>
  );
}
