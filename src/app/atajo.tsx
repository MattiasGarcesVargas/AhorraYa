import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Encabezado } from '@/components/encabezado';
import { Chip } from '@/components/ui';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { GuiaAtajo } from '@/modules/atajo/components/guia-atajo';
import { GuiaWallet } from '@/modules/atajo/components/guia-wallet';

type Guia = 'atajo' | 'wallet';

/** Las dos formas de registrar sin abrir la app: el doble toque atrás y los pagos con Apple Pay. */
export default function AtajoScreen() {
  const insets = useSafeAreaInsets();
  const [guia, setGuia] = useState<Guia>('atajo');

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo="Registro rápido" variante="pila" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View className="mb-5 flex-row gap-2" accessibilityRole="tablist">
          <Chip
            texto="Doble toque atrás"
            icono="phone-portrait-outline"
            seleccionado={guia === 'atajo'}
            onPress={() => setGuia('atajo')}
          />
          <Chip
            texto="Apple Pay"
            icono="card-outline"
            seleccionado={guia === 'wallet'}
            onPress={() => setGuia('wallet')}
          />
        </View>
        {guia === 'atajo' ? <GuiaAtajo /> : <GuiaWallet />}
      </ScrollView>
    </View>
  );
}
