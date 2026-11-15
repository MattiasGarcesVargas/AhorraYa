import { View } from 'react-native';

import type { NombreIcono } from '@/constants/categorias.constants';

import { Boton, Icono, Texto } from './ui';

export interface EstadoVacioProps {
  icono: NombreIcono;
  titulo: string;
  mensaje: string;
  accion?: { texto: string; alPulsar: () => void };
}

/** Un vacío que enseña qué hacer, no sólo que no hay nada. */
export function EstadoVacio({ icono, titulo, mensaje, accion }: EstadoVacioProps) {
  return (
    <View className="items-center rounded-xl bg-superficie px-6 py-8">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-acento">
        <Icono nombre={icono} tamano={22} color="acento-texto" />
      </View>
      <Texto peso="bold" className="text-center">
        {titulo}
      </Texto>
      <Texto variante="detalle" tono="suave" className="mt-1 text-center">
        {mensaje}
      </Texto>
      {accion ? (
        <Boton
          texto={accion.texto}
          tamano="sm"
          className="mt-4 self-center"
          onPress={accion.alPulsar}
        />
      ) : null}
    </View>
  );
}
