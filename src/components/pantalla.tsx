import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESPACIO_FINAL_PESTANAS, MARGEN_PANTALLA } from '@/constants/layout.constants';

import { Logo, Texto } from './ui';

export interface PantallaProps {
  titulo: string;
  /** Línea pequeña sobre el título (fecha, periodo). */
  antetitulo?: string;
  /** Acción de la esquina (normalmente un `BotonIcono`). */
  accion?: ReactNode;
  /** Muestra el logotipo en lugar del título escrito (la pantalla de inicio). */
  conLogo?: boolean;
  children: ReactNode;
}

/**
 * Esqueleto de cada pestaña: título grande propio (no la cabecera nativa)
 * para que se vea igual en iOS, Android y web, y aire final suficiente para
 * que la barra de pestañas flotante no tape el último elemento.
 */
export function Pantalla({ titulo, antetitulo, accion, conLogo, children }: PantallaProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + ESPACIO_FINAL_PESTANAS,
        paddingHorizontal: MARGEN_PANTALLA,
      }}
    >
      <View className="mb-6 flex-row items-end justify-between gap-4">
        <View className="flex-1">
          {antetitulo ? (
            <Texto variante="detalle" tono="suave" className="mb-0.5">
              {antetitulo}
            </Texto>
          ) : null}
          {conLogo ? (
            <View accessibilityRole="header" accessibilityLabel={titulo} className="pt-1">
              <Logo ancho={148} />
            </View>
          ) : (
            <Texto variante="titulo" accessibilityRole="header">
              {titulo}
            </Texto>
          )}
        </View>
        {accion}
      </View>
      {children}
    </ScrollView>
  );
}
