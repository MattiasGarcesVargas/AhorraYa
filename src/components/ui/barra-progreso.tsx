import { View } from 'react-native';
import { tv } from 'tailwind-variants';

const pista = tv({
  base: 'w-full overflow-hidden rounded-full',
  variants: {
    sobre: { claro: 'bg-superficie-alta', tinta: 'bg-tinta-borde' },
    grosor: { fino: 'h-1.5', normal: 'h-2', grueso: 'h-3' },
  },
  defaultVariants: { sobre: 'claro', grosor: 'normal' },
});

const relleno = tv({
  base: 'h-full rounded-full',
  variants: {
    tono: { primario: 'bg-primario', menta: 'bg-menta', peligro: 'bg-peligro', tinta: 'bg-texto' },
  },
  defaultVariants: { tono: 'primario' },
});

export interface BarraProgresoProps {
  /** 0–100. Por encima de 100 se dibuja llena: el exceso lo dice el texto. */
  valor: number;
  tono?: 'primario' | 'menta' | 'peligro' | 'tinta';
  sobre?: 'claro' | 'tinta';
  grosor?: 'fino' | 'normal' | 'grueso';
  etiqueta?: string;
}

export function BarraProgreso({
  valor,
  tono = 'primario',
  sobre = 'claro',
  grosor = 'normal',
  etiqueta,
}: BarraProgresoProps) {
  const acotado = Math.max(0, Math.min(100, Number.isFinite(valor) ? valor : 0));

  return (
    <View
      className={pista({ sobre, grosor })}
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(acotado) }}
    >
      {/* Un mínimo visible para que "algo gastado" no se lea como "nada". */}
      <View
        className={relleno({ tono })}
        style={{ width: `${acotado > 0 ? Math.max(acotado, 2) : 0}%` }}
      />
    </View>
  );
}
