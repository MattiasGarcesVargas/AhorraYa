import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Texto } from './ui';

// `tv` resuelve conflictos con tailwind-merge: un `mt-0` de fuera gana al `mt-8`.
const seccion = tv({ base: 'mt-8' });

export interface SeccionProps {
  titulo: string;
  /** Enlace de texto a la derecha del título ("Ver todo"). */
  accion?: { texto: string; alPulsar: () => void };
  children: ReactNode;
  className?: string;
}

/** Bloque con título. Las secciones se separan con espacio, no con cajas. */
export function Seccion({ titulo, accion, children, className }: SeccionProps) {
  return (
    <View className={seccion({ className })}>
      <View className="mb-2 min-h-8 flex-row items-center justify-between">
        <Texto variante="cuerpo" peso="semibold" accessibilityRole="header">
          {titulo}
        </Texto>
        {accion ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            className="min-h-11 justify-center"
            onPress={accion.alPulsar}
          >
            <Texto variante="detalle" peso="medium" tono="primario">
              {accion.texto}
            </Texto>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
