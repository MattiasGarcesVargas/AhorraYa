import { Pressable, View } from 'react-native';

import { AvatarCategoria } from '@/components/avatar-categoria';
import { Icono, Texto } from '@/components/ui';
import type { Centavos } from '@/lib/dinero';
import { formatDiaMes, type FechaIso } from '@/lib/fechas';
import { formatMoneda } from '@/lib/format';
import type { Categoria } from '@/modules/categorias/categorias.types';

import type { Suscripcion } from '../suscripciones.types';

export interface FilaSuscripcionProps {
  suscripcion: Suscripcion;
  categoria: Pick<Categoria, 'icono' | 'color'>;
  proximoCobro: FechaIso;
  /** Lo que el banco descuenta de verdad (con IVA e ISD). Sólo en apps del exterior con tarjeta. */
  cobradoCentavos: Centavos | null;
  alPulsar: () => void;
}

export function FilaSuscripcion({
  suscripcion,
  categoria,
  proximoCobro,
  cobradoCentavos,
  alPulsar,
}: FilaSuscripcionProps) {
  const detalle = suscripcion.activa
    ? `Día ${suscripcion.diaCobro} · próximo ${formatDiaMes(proximoCobro)}`
    : `Día ${suscripcion.diaCobro} · en pausa`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${suscripcion.nombre}, ${formatMoneda(suscripcion.montoCentavos)} al mes, ${detalle}. Editar.`}
      onPress={alPulsar}
      className={`flex-row items-center gap-3 px-4 py-3 active:bg-superficie-alta ${
        suscripcion.activa ? '' : 'opacity-50'
      }`}
    >
      <AvatarCategoria icono={categoria.icono} color={categoria.color} tamano={36} />
      <View className="flex-1">
        <Texto peso="semibold" numberOfLines={1}>
          {suscripcion.nombre}
        </Texto>
        <Texto variante="detalle" tono="suave" numerico>
          {detalle}
        </Texto>
      </View>
      <View className="items-end">
        <Texto peso="bold" numerico>
          {formatMoneda(suscripcion.montoCentavos)}
        </Texto>
        {cobradoCentavos !== null ? (
          <Texto variante="detalle" tono="suave" numerico>
            Cobran {formatMoneda(cobradoCentavos)}
          </Texto>
        ) : null}
      </View>
      <Icono nombre="chevron-forward" tamano={16} color="texto-suave" />
    </Pressable>
  );
}
