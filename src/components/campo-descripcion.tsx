import { TextInput } from 'react-native';

import { FUENTES } from '@/constants/tema.constants';
import { useTema } from '@/providers/tema-provider';

export interface CampoDescripcionProps {
  valor: string;
  alCambiar: (texto: string) => void;
  marcador?: string;
  largoMaximo?: number;
}

/** Descripción libre de un registro: qué fue ("Almuerzo con Ana", "Uber al trabajo"). */
export function CampoDescripcion({
  valor,
  alCambiar,
  marcador = 'Descripción (opcional)',
  largoMaximo = 120,
}: CampoDescripcionProps) {
  const { colores } = useTema();
  return (
    <TextInput
      value={valor}
      onChangeText={alCambiar}
      placeholder={marcador}
      placeholderTextColor={colores['texto-suave']}
      maxLength={largoMaximo}
      returnKeyType="done"
      accessibilityLabel="Descripción"
      className="h-11 rounded-full bg-superficie px-4 text-sm text-texto"
      style={{ fontFamily: FUENTES.medium }}
    />
  );
}
