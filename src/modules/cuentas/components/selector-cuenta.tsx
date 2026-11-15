import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import { hapticos } from '@/lib/hapticos';

import type { Cuenta } from '../cuentas.types';
import { TIPOS_CUENTA } from '../utils/textos-cuenta';

export interface SelectorCuentaProps {
  cuentas: readonly Cuenta[];
  valor: number | null;
  alCambiar: (cuentaId: number | null) => void;
  /** Texto de la opción "ninguna cuenta" (p. ej. "Efectivo"). Sin él, no se ofrece. */
  ninguna?: string;
}

/** Elegir una cuenta entre las propias, en una fila de chips. */
export function SelectorCuenta({ cuentas, valor, alCambiar, ninguna }: SelectorCuentaProps) {
  const elegir = (id: number | null) => {
    hapticos.seleccion();
    alCambiar(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
      accessibilityRole="radiogroup"
    >
      {cuentas.map((cuenta) => (
        <Chip
          key={cuenta.id}
          texto={cuenta.nombre}
          icono={TIPOS_CUENTA[cuenta.tipo].icono}
          seleccionado={valor === cuenta.id}
          onPress={() => elegir(cuenta.id)}
        />
      ))}
      {ninguna ? (
        <Chip texto={ninguna} seleccionado={valor === null} onPress={() => elegir(null)} />
      ) : null}
    </ScrollView>
  );
}
