import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';

import { hapticos } from '@/lib/hapticos';
import { useTema } from '@/providers/tema-provider';

import { Texto } from './ui';

/**
 * Barra de pestañas propia para Android, web y iPhone sin Liquid Glass (en
 * iOS 26 la dibuja el sistema, ver `(tabs)/_layout.tsx`).
 *
 * La activa se marca con el icono relleno y en negro/verde; el resto en gris.
 * Separación con el contenido por un trazo de un píxel, no por sombra.
 */
export function BarraPestanas({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colores } = useTema();

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-borde bg-fondo"
      // Objeto, no arreglo: ver el comentario de `Texto`.
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {state.routes.map((ruta, indice) => {
        const { options } = descriptors[ruta.key];
        const activa = state.index === indice;
        const color = activa ? colores.primario : colores['texto-suave'];
        const titulo = typeof options.title === 'string' ? options.title : ruta.name;

        const pulsar = () => {
          // Mismo contrato que la barra por defecto de expo-router (SDK 58):
          // se avisa del toque y, si nadie lo cancela, se cambia de pestaña.
          const evento = emitter.emit({
            type: 'tabPress',
            target: ruta.key,
            canPreventDefault: true,
          });
          if (!activa && !evento.defaultPrevented) {
            hapticos.seleccion();
            navigateToTab(ruta.key);
          }
        };

        return (
          <Pressable
            key={ruta.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={titulo}
            onPress={pulsar}
            className="flex-1 items-center gap-1 pt-2"
          >
            {options.tabBarIcon?.({ focused: activa, color, size: 24 })}
            <Texto variante="mini" peso={activa ? 'bold' : 'semibold'} style={{ color }}>
              {titulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
