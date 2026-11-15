import { Image } from 'react-native';

import { useTema } from '@/providers/tema-provider';

import LOGO from '../../../assets/images/logo.png';

/** Proporción de `assets/images/logo.png` (1296 × 352). */
const PROPORCION = 1296 / 352;

export interface LogoProps {
  /** Ancho en puntos; el alto sale de la proporción del archivo. */
  ancho?: number;
}

/**
 * El logotipo de AhorraYa. El PNG es un glifo de un solo color sobre
 * transparente y se tiñe con el token `marca`: verde oscuro en claro, menta en
 * oscuro (el verde de la marca no se lee sobre negro).
 */
export function Logo({ ancho = 140 }: LogoProps) {
  const { colores } = useTema();
  return (
    <Image
      source={LOGO}
      accessibilityRole="image"
      accessibilityLabel="AhorraYa"
      resizeMode="contain"
      style={{ width: ancho, height: ancho / PROPORCION, tintColor: colores.marca }}
    />
  );
}
