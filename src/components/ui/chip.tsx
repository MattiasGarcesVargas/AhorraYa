import { Pressable, type PressableProps } from 'react-native';
import { tv } from 'tailwind-variants';

import type { NombreIcono } from '@/constants/categorias.constants';

import { Icono } from './icono';
import { Texto } from './texto';

const chip = tv({
  base: 'h-11 flex-row items-center justify-center gap-1.5 rounded-full px-4 active:opacity-80',
  variants: {
    seleccionado: {
      true: 'bg-seleccion',
      false: 'bg-superficie',
    },
  },
});

export interface ChipProps extends Omit<PressableProps, 'children'> {
  texto: string;
  icono?: NombreIcono;
  seleccionado: boolean;
  className?: string;
}

/**
 * Opción seleccionable. La selección se nota por el RELLENO (negro sobre
 * gris claro), no sólo por el color, y se anuncia a VoiceOver con
 * `accessibilityState`.
 */
export function Chip({ texto, icono, seleccionado, className, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      className={chip({ seleccionado, className })}
      {...props}
    >
      {icono ? (
        <Icono
          nombre={icono}
          tamano={16}
          color={seleccionado ? 'seleccion-icono' : 'texto-suave'}
        />
      ) : null}
      <Texto variante="detalle" peso="semibold" tono={seleccionado ? 'seleccion' : 'normal'}>
        {texto}
      </Texto>
    </Pressable>
  );
}
