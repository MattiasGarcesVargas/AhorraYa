import { Pressable, type PressableProps } from 'react-native';
import { tv } from 'tailwind-variants';

import type { NombreIcono } from '@/constants/categorias.constants';
import type { NombreToken } from '@/constants/tema.constants';

import { Icono } from './icono';

const botonIcono = tv({
  // 44 pt: el mínimo de toque cómodo de Apple, aunque el icono sea de 20.
  base: 'h-11 w-11 items-center justify-center rounded-full active:opacity-70',
  variants: {
    variante: {
      primario: 'bg-primario',
      suave: 'bg-superficie',
      fantasma: 'bg-transparent',
      tinta: 'bg-tinta-borde',
    },
  },
  defaultVariants: { variante: 'suave' },
});

const COLOR: Record<'primario' | 'suave' | 'fantasma' | 'tinta', NombreToken> = {
  primario: 'primario-texto',
  suave: 'texto',
  fantasma: 'texto',
  tinta: 'tinta-texto',
};

export interface BotonIconoProps extends Omit<PressableProps, 'children'> {
  icono: NombreIcono;
  /** Obligatorio: un botón sólo con icono necesita nombre para VoiceOver. */
  etiqueta: string;
  variante?: 'primario' | 'suave' | 'fantasma' | 'tinta';
  className?: string;
}

export function BotonIcono({
  icono,
  etiqueta,
  variante = 'suave',
  className,
  ...props
}: BotonIconoProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={6}
      className={botonIcono({ variante, className })}
      {...props}
    >
      <Icono nombre={icono} tamano={22} color={COLOR[variante]} />
    </Pressable>
  );
}
