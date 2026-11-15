import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import { METODOS_PAGO, type MetodoPagoId } from '@/constants/metodos-pago.constants';
import { hapticos } from '@/lib/hapticos';

export interface SelectorMetodoPagoProps {
  valor: MetodoPagoId;
  alCambiar: (metodo: MetodoPagoId) => void;
}

export function SelectorMetodoPago({ valor, alCambiar }: SelectorMetodoPagoProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
      accessibilityRole="radiogroup"
    >
      {METODOS_PAGO.map((metodo) => (
        <Chip
          key={metodo.id}
          texto={metodo.nombre}
          icono={metodo.icono}
          seleccionado={valor === metodo.id}
          onPress={() => {
            hapticos.seleccion();
            alCambiar(metodo.id);
          }}
        />
      ))}
    </ScrollView>
  );
}
