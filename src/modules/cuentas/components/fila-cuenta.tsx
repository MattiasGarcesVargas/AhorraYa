import { Pressable, View } from 'react-native';

import { AvatarCategoria } from '@/components/avatar-categoria';
import { Icono, Texto } from '@/components/ui';
import { bancoPorId } from '@/constants/bancos.constants';
import { formatMoneda } from '@/lib/format';

import type { SaldoCuenta } from '../utils/saldos';
import { subtituloCuenta, TIPOS_CUENTA } from '../utils/textos-cuenta';

export interface FilaCuentaProps {
  saldo: SaldoCuenta;
  alPulsar: () => void;
}

/** Una cuenta en la lista: banco, saldo y, si paga interés, lo que dejó hoy. */
export function FilaCuenta({ saldo, alPulsar }: FilaCuentaProps) {
  const { cuenta } = saldo;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cuenta.nombre}, ${formatMoneda(saldo.saldo)}`}
      onPress={alPulsar}
      className="min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-superficie-alta"
    >
      <AvatarCategoria
        icono={TIPOS_CUENTA[cuenta.tipo].icono}
        color={bancoPorId(cuenta.banco).color}
      />
      <View className="flex-1">
        <Texto numberOfLines={1}>{cuenta.nombre}</Texto>
        <Texto variante="detalle" tono="suave" numberOfLines={1}>
          {subtituloCuenta(cuenta, saldo.tasaBp)}
        </Texto>
      </View>
      <View className="items-end">
        <Texto peso="medium" numerico>
          {formatMoneda(saldo.saldo)}
        </Texto>
        {saldo.interesDiario > 0 ? (
          <Texto variante="mini" tono="primario" numerico>
            +{formatMoneda(saldo.interesDiario)} al día
          </Texto>
        ) : null}
      </View>
      <Icono nombre="chevron-forward" tamano={16} color="texto-suave" />
    </Pressable>
  );
}
