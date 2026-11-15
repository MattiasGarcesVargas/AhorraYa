import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const superficie = tv({
  base: 'rounded-xl',
  variants: {
    variante: {
      /** Gris verdoso suave: agrupa filas (estilo lista agrupada de iOS). */
      suave: 'bg-superficie',
      /** Negro: SÓLO la tarjeta protagonista de cada pantalla. */
      tinta: 'bg-tinta',
      /** Verde muy claro: avisos positivos y llamados a la acción. */
      acento: 'bg-acento',
      contorno: 'border border-borde',
    },
    relleno: { ninguno: 'p-0', sm: 'p-3', md: 'p-4', lg: 'p-5' },
  },
  defaultVariants: { variante: 'suave', relleno: 'md' },
});

export interface SuperficieProps extends ViewProps, VariantProps<typeof superficie> {
  className?: string;
}

/**
 * Contenedor con fondo. Regla de diseño: una superficie NUNCA va dentro de
 * otra — si hace falta separar dentro, se usa espacio o un `Separador`.
 */
export function Superficie({ variante, relleno, className, ...props }: SuperficieProps) {
  return <View {...props} className={superficie({ variante, relleno, className })} />;
}
