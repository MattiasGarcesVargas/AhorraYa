import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import type { NombreIcono } from '@/constants/categorias.constants';
import type { NombreToken } from '@/constants/tema.constants';
import { colorLegibleSobre } from '@/lib/color';
import { useTema } from '@/providers/tema-provider';

export interface AvatarCategoriaProps {
  icono: NombreIcono;
  color: NombreToken;
  tamano?: number;
}

/** Círculo con el color de la categoría y su icono en blanco o negro, el que se lea mejor. */
export function AvatarCategoria({ icono, color, tamano = 40 }: AvatarCategoriaProps) {
  const { colores } = useTema();
  const fondo = colores[color];

  return (
    <View
      style={{ width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: fondo }}
      className="items-center justify-center"
    >
      <Ionicons name={icono} size={Math.round(tamano * 0.48)} color={colorLegibleSobre(fondo)} />
    </View>
  );
}
