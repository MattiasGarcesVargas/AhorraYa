import { Pressable, View } from 'react-native';

import type { NombreIcono } from '@/constants/categorias.constants';

import { Icono, Texto } from './ui';

export interface FilaOpcionProps {
  titulo: string;
  detalle?: string;
  valor?: string;
  icono?: NombreIcono;
  peligro?: boolean;
  alPulsar?: () => void;
}

/** Fila de ajustes: icono, título, valor actual y chevron si se puede tocar. */
export function FilaOpcion({ titulo, detalle, valor, icono, peligro, alPulsar }: FilaOpcionProps) {
  return (
    <Pressable
      accessibilityRole={alPulsar ? 'button' : undefined}
      disabled={!alPulsar}
      onPress={alPulsar}
      className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-superficie-alta"
    >
      {icono ? (
        <Icono nombre={icono} tamano={20} color={peligro ? 'peligro' : 'texto-suave'} />
      ) : null}
      <View className="flex-1">
        <Texto tono={peligro ? 'peligro' : 'normal'}>{titulo}</Texto>
        {detalle ? (
          <Texto variante="detalle" tono="suave">
            {detalle}
          </Texto>
        ) : null}
      </View>
      {valor ? (
        <Texto tono="suave" numerico>
          {valor}
        </Texto>
      ) : null}
      {alPulsar && !peligro ? (
        <Icono nombre="chevron-forward" tamano={16} color="texto-suave" />
      ) : null}
    </Pressable>
  );
}
