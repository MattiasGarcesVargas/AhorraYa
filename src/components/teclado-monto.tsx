import { Pressable, View } from 'react-native';

import type { Tecla } from '@/lib/entrada-monto';
import { hapticos } from '@/lib/hapticos';

import { Icono, Texto } from './ui';

const FILAS: Tecla[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'borrar'],
];

export interface TecladoMontoProps {
  alPulsar: (tecla: Tecla) => void;
}

/**
 * Teclado numérico propio en vez del del sistema: siempre está a la vista
 * (no hay que tocar un campo para que aparezca), no empuja la pantalla al
 * abrirse y tiene el punto decimal donde se espera. Es lo que hace que
 * registrar un gasto tome dos segundos.
 */
export function TecladoMonto({ alPulsar }: TecladoMontoProps) {
  const pulsar = (tecla: Tecla) => {
    hapticos.tecla();
    alPulsar(tecla);
  };

  return (
    <View className="gap-2">
      {FILAS.map((fila) => (
        <View key={fila.join('')} className="flex-row gap-2">
          {fila.map((tecla) => (
            <Pressable
              key={tecla}
              accessibilityRole="keyboardkey"
              accessibilityLabel={
                tecla === 'borrar' ? 'Borrar' : tecla === '.' ? 'Punto decimal' : tecla
              }
              onPress={() => pulsar(tecla)}
              onLongPress={tecla === 'borrar' ? () => pulsar('borrar') : undefined}
              className="h-14 flex-1 items-center justify-center rounded-lg bg-superficie active:bg-superficie-alta"
            >
              {tecla === 'borrar' ? (
                <Icono nombre="backspace-outline" tamano={24} />
              ) : (
                <Texto variante="subtitulo" peso="semibold" numerico>
                  {tecla}
                </Texto>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
