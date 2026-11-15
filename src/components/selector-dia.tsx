import { View } from 'react-native';

import { formatDiaRelativo, hoyIso, sumarDias, type FechaIso } from '@/lib/fechas';
import { hapticos } from '@/lib/hapticos';

import { BotonIcono, Texto } from './ui';

export interface SelectorDiaProps {
  valor: FechaIso;
  alCambiar: (fecha: FechaIso) => void;
}

/**
 * Elegir el día de un registro yendo hacia atrás o adelante de a uno. No deja
 * pasar de hoy: nada se registra en el futuro.
 */
export function SelectorDia({ valor, alCambiar }: SelectorDiaProps) {
  const hoy = hoyIso();
  const mover = (dias: number) => {
    hapticos.seleccion();
    alCambiar(sumarDias(valor, dias));
  };

  return (
    <View className="flex-row items-center justify-between rounded-full bg-superficie px-1">
      <BotonIcono
        icono="chevron-back"
        etiqueta="Día anterior"
        variante="fantasma"
        onPress={() => mover(-1)}
      />
      <Texto variante="detalle" peso="semibold" accessibilityLiveRegion="polite">
        {formatDiaRelativo(valor, hoy)}
      </Texto>
      <BotonIcono
        icono="chevron-forward"
        etiqueta="Día siguiente"
        variante="fantasma"
        disabled={valor >= hoy}
        className={valor >= hoy ? 'opacity-30' : undefined}
        onPress={() => mover(1)}
      />
    </View>
  );
}
