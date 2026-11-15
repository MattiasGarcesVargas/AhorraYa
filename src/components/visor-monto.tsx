import { View } from 'react-native';

import { Texto } from './ui';

/**
 * El importe que se está tecleando, tal cual se escribe (`12.`, `12.5`), en
 * grande. Vacío muestra un `0` atenuado como guía, no como valor.
 */
export function VisorMonto({ entrada, etiqueta }: { entrada: string; etiqueta?: string }) {
  const vacio = entrada === '';
  const [entero, decimales] = (vacio ? '0' : entrada).split('.');
  const enteroConMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <View className="items-center py-6" accessibilityLiveRegion="polite">
      {etiqueta ? (
        <Texto variante="detalle" tono="suave" className="mb-1">
          {etiqueta}
        </Texto>
      ) : null}
      <View className="flex-row items-baseline">
        <Texto variante="subtitulo" peso="regular" tono="suave" className="mr-1">
          $
        </Texto>
        <Texto
          variante="display"
          peso="bold"
          tono={vacio ? 'suave' : 'normal'}
          numerico
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {enteroConMiles}
          {decimales !== undefined ? `.${decimales}` : ''}
        </Texto>
      </View>
    </View>
  );
}
