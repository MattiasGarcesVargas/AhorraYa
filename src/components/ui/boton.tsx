import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

import type { NombreIcono } from '@/constants/categorias.constants';
import type { NombreToken } from '@/constants/tema.constants';
import { useTema } from '@/providers/tema-provider';

import { Icono } from './icono';
import { Texto } from './texto';

const boton = tv({
  base: 'flex-row items-center justify-center gap-2 rounded-lg active:opacity-80',
  variants: {
    variante: {
      primario: 'bg-primario',
      // Secundario = contorno con cuerpo: se ve pulsable sin competir con el primario.
      secundario: 'border border-borde bg-superficie',
      contorno: 'border border-borde bg-transparent',
      fantasma: 'bg-transparent',
      peligro: 'bg-peligro-suave',
      claro: 'bg-tinta-texto',
      'tinta-contorno': 'border border-tinta-borde bg-transparent',
    },
    tamano: {
      sm: 'h-11 px-4',
      md: 'h-12 px-5',
      lg: 'h-14 px-6',
    },
    ancho: { true: 'w-full', false: 'self-start' },
    deshabilitado: { true: 'opacity-40', false: '' },
  },
  defaultVariants: { variante: 'primario', tamano: 'md', ancho: false, deshabilitado: false },
});

type Variante = NonNullable<VariantProps<typeof boton>['variante']>;

/** Color del texto e icono de cada variante: contraste ≥ 4.5:1 en ambos modos. */
const TONO_CONTENIDO: Record<Variante, NombreToken> = {
  primario: 'primario-texto',
  secundario: 'texto',
  contorno: 'texto',
  fantasma: 'primario',
  peligro: 'peligro',
  claro: 'tinta',
  'tinta-contorno': 'tinta-texto',
};

const TONO_TEXTO = {
  'primario-texto': 'invertido',
  texto: 'normal',
  primario: 'primario',
  peligro: 'peligro',
  tinta: 'normal',
  'tinta-texto': 'tinta',
} as const;

export interface BotonProps extends Omit<PressableProps, 'children'> {
  texto: string;
  icono?: NombreIcono;
  variante?: Variante;
  tamano?: 'sm' | 'md' | 'lg';
  ancho?: boolean;
  cargando?: boolean;
  className?: string;
}

export function Boton({
  texto,
  icono,
  variante = 'primario',
  tamano = 'md',
  ancho = false,
  cargando = false,
  disabled,
  className,
  ...props
}: BotonProps) {
  const { colores } = useTema();
  const tono = TONO_CONTENIDO[variante];
  const inactivo = disabled || cargando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: cargando }}
      disabled={inactivo}
      className={boton({ variante, tamano, ancho, deshabilitado: !!disabled, className })}
      {...props}
    >
      {cargando ? (
        <ActivityIndicator color={colores[tono]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icono ? <Icono nombre={icono} tamano={18} color={tono} /> : null}
          <Texto
            peso="semibold"
            variante={tamano === 'sm' ? 'detalle' : 'cuerpo'}
            tono={TONO_TEXTO[tono as keyof typeof TONO_TEXTO]}
            className={variante === 'claro' ? 'text-tinta' : undefined}
          >
            {texto}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}
