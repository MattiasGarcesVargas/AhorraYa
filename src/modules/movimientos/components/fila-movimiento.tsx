import { Pressable, View } from 'react-native';

import { AvatarCategoria } from '@/components/avatar-categoria';
import { Texto } from '@/components/ui';
import { formatMonedaConSigno } from '@/lib/format';

import type { Movimiento } from '../movimientos.types';

export interface FilaMovimientoProps {
  movimiento: Movimiento;
  /** Tocar para abrirlo y corregirlo. */
  alPulsar?: (movimiento: Movimiento) => void;
  /** Mantener presionado para eliminar (el gesto estándar de iOS para acciones secundarias). */
  alMantener?: (movimiento: Movimiento) => void;
}

export function FilaMovimiento({ movimiento, alPulsar, alMantener }: FilaMovimientoProps) {
  const pistas = [
    alPulsar ? 'Toca para editar' : null,
    alMantener ? 'Mantén presionado para eliminar' : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole={pistas.length > 0 ? 'button' : undefined}
      accessibilityHint={pistas.join('. ') || undefined}
      onPress={alPulsar ? () => alPulsar(movimiento) : undefined}
      onLongPress={alMantener ? () => alMantener(movimiento) : undefined}
      delayLongPress={350}
      className="min-h-14 flex-row items-center gap-3 py-2.5 active:opacity-70"
    >
      <AvatarCategoria icono={movimiento.icono} color={movimiento.color} />
      <View className="flex-1">
        <Texto numberOfLines={1}>{movimiento.titulo}</Texto>
        <Texto variante="detalle" tono="suave" numberOfLines={1}>
          {movimiento.detalle}
        </Texto>
      </View>
      <Texto peso="medium" numerico tono={movimiento.tono === 'positivo' ? 'primario' : 'normal'}>
        {formatMonedaConSigno(movimiento.importe)}
      </Texto>
    </Pressable>
  );
}
