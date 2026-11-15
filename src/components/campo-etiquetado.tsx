import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Texto } from './ui';

export interface CampoEtiquetadoProps {
  etiqueta: string;
  /** Texto breve bajo el control, sólo si evita un error. */
  ayuda?: string;
  /** Qué está mal: reemplaza a la ayuda. */
  error?: string;
  /** Acción pequeña a la derecha de la etiqueta (p. ej. "+ Nueva"). */
  accion?: ReactNode;
  children: ReactNode;
}

/**
 * Un campo de formulario: etiqueta visible arriba, control debajo y 20 pt de
 * aire hasta el siguiente. Así todas las hojas comparten el mismo ritmo.
 */
export function CampoEtiquetado({
  etiqueta,
  ayuda,
  error,
  accion,
  children,
}: CampoEtiquetadoProps) {
  return (
    <View className="mb-5">
      <View className="mb-2 min-h-[20px] flex-row items-center justify-between">
        <Texto variante="detalle" tono="suave">
          {etiqueta}
        </Texto>
        {accion}
      </View>
      {children}
      {error ? (
        <Texto variante="detalle" tono="peligro" className="mt-2" accessibilityLiveRegion="polite">
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="mini" tono="suave" className="mt-2">
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}
