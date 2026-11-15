import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useTema } from '@/providers/tema-provider';

import { Logo } from './ui';

/** Mismo ancho que `imageWidth` del splash nativo en `app.json`: el relevo no salta. */
const ANCHO_LOGO = 240;
const PAUSA_MS = 600;
const DESVANECER_MS = 450;

/**
 * Pantalla de carga con el logo. Es una copia exacta del splash nativo (mismo
 * fondo, mismo logo, mismo tamaño) que se monta encima de la app justo cuando
 * el nativo se oculta, y se desvanece. Así la entrada es suave y, en Expo Go
 * (que no usa el splash de `app.json`), el logo también se ve.
 *
 * No bloquea nada: la app ya está montada debajo, y los toques pasan a
 * través mientras se desvanece. Un registro desde el atajo no espera por ella.
 */
export function PantallaCarga() {
  const { colores } = useTema();
  // En estado y no en ref: se crea una vez y se puede leer al renderizar.
  const [opacidad] = useState(() => new Animated.Value(1));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const animacion = Animated.sequence([
      Animated.delay(PAUSA_MS),
      Animated.timing(opacidad, {
        toValue: 0,
        duration: DESVANECER_MS,
        useNativeDriver: true,
      }),
    ]);
    animacion.start(({ finished }) => {
      if (finished) setVisible(false);
    });
    return () => animacion.stop();
  }, [opacidad]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colores.fondo,
          opacity: opacidad,
        },
      ]}
    >
      <Logo ancho={ANCHO_LOGO} />
    </Animated.View>
  );
}
