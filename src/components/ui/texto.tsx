import { StyleSheet, Text, type TextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

import { FUENTES, type PesoFuente } from '@/constants/tema.constants';

const texto = tv({
  variants: {
    variante: {
      display: 'text-[44px] leading-[50px] tracking-tight',
      titulo: 'text-[30px] leading-[36px] tracking-tight',
      subtitulo: 'text-xl leading-7',
      cuerpo: 'text-base leading-6',
      detalle: 'text-sm leading-5',
      mini: 'text-xs leading-4',
    },
    tono: {
      normal: 'text-texto',
      suave: 'text-texto-suave',
      primario: 'text-primario',
      peligro: 'text-peligro',
      acento: 'text-acento-texto',
      invertido: 'text-primario-texto',
      tinta: 'text-tinta-texto',
      'tinta-suave': 'text-tinta-suave',
      menta: 'text-menta',
      seleccion: 'text-seleccion-texto',
    },
  },
  defaultVariants: { variante: 'cuerpo', tono: 'normal' },
});

const PESO_POR_VARIANTE: Record<NonNullable<VariantProps<typeof texto>['variante']>, PesoFuente> = {
  display: 'extrabold',
  titulo: 'extrabold',
  subtitulo: 'bold',
  cuerpo: 'medium',
  detalle: 'medium',
  mini: 'semibold',
};

export interface TextoProps extends TextProps, VariantProps<typeof texto> {
  peso?: PesoFuente;
  /** Cifras de ancho fijo: los importes en columna no "bailan" al cambiar. */
  numerico?: boolean;
  className?: string;
}

/**
 * Único componente de texto de la app. El peso elige la FAMILIA de Manrope
 * (ver `FUENTES`) en vez de `fontWeight`, que en Android no cambia de archivo.
 */
export function Texto({
  variante = 'cuerpo',
  tono,
  peso,
  numerico = false,
  className,
  style,
  ...props
}: TextoProps) {
  // Un OBJETO y no un arreglo: NativeWind en web hace `push` de la clase dentro
  // del arreglo de estilos, y como React Compiler reutiliza ese arreglo entre
  // renders, las clases se acumulaban (el texto de un chip quedaba con el
  // color de antes al seleccionarlo).
  const estilo = {
    fontFamily: FUENTES[peso ?? PESO_POR_VARIANTE[variante]],
    ...(numerico ? { fontVariant: ['tabular-nums' as const] } : null),
    ...StyleSheet.flatten(style),
  };

  return <Text {...props} className={texto({ variante, tono, className })} style={estilo} />;
}
