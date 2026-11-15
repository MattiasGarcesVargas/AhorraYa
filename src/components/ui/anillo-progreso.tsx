import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { NombreToken } from '@/constants/tema.constants';
import { useTema } from '@/providers/tema-provider';

export interface AnilloProgresoProps {
  /** 0–100. */
  valor: number;
  tamano?: number;
  grosor?: number;
  color?: NombreToken;
  pista?: NombreToken;
  children?: ReactNode;
}

/** Anillo de avance (meta de ahorro). Empieza arriba y avanza en sentido horario. */
export function AnilloProgreso({
  valor,
  tamano = 64,
  grosor = 7,
  color = 'menta',
  pista = 'tinta-borde',
  children,
}: AnilloProgresoProps) {
  const { colores } = useTema();
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const acotado = Math.max(0, Math.min(100, Number.isFinite(valor) ? valor : 0));

  return (
    <View style={{ width: tamano, height: tamano }} className="items-center justify-center">
      <Svg
        width={tamano}
        height={tamano}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          stroke={colores[pista]}
          strokeWidth={grosor}
          fill="none"
        />
        <Circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          stroke={colores[color]}
          strokeWidth={grosor}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circunferencia} ${circunferencia}`}
          strokeDashoffset={circunferencia * (1 - acotado / 100)}
        />
      </Svg>
      {children}
    </View>
  );
}
