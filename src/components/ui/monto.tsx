import { View } from 'react-native';

import type { Centavos } from '@/lib/dinero';
import { formatMoneda, partesImporte } from '@/lib/format';

import { Texto, type TextoProps } from './texto';

const TAMANOS = {
  xl: { entero: 'display', resto: 'subtitulo' },
  lg: { entero: 'titulo', resto: 'cuerpo' },
  md: { entero: 'subtitulo', resto: 'detalle' },
} as const;

export interface MontoProps {
  centavos: Centavos;
  tamano?: keyof typeof TAMANOS;
  tono?: TextoProps['tono'];
  /** Los centavos en gris: el entero es lo que se lee de un vistazo. */
  restoSuave?: boolean;
}

/**
 * Importe protagonista: `$` y centavos más pequeños que el entero, alineados
 * por la base. Es la jerarquía de las apps de banca: se lee "142", no
 * "$ 142.50" con todo al mismo peso.
 */
export function Monto({ centavos, tamano = 'xl', tono = 'normal', restoSuave = true }: MontoProps) {
  const { signo, entero, decimales } = partesImporte(centavos);
  const t = TAMANOS[tamano];
  const tonoResto = restoSuave
    ? tono === 'tinta'
      ? 'tinta-suave'
      : tono === 'normal'
        ? 'suave'
        : tono
    : tono;

  return (
    <View
      className="flex-row items-baseline"
      accessible
      accessibilityLabel={formatMoneda(centavos)}
    >
      <Texto variante={t.resto} peso="semibold" tono={tonoResto} numerico className="mr-1">
        {signo}$
      </Texto>
      <Texto variante={t.entero} tono={tono} numerico>
        {entero}
      </Texto>
      <Texto variante={t.resto} peso="semibold" tono={tonoResto} numerico>
        .{decimales}
      </Texto>
    </View>
  );
}
