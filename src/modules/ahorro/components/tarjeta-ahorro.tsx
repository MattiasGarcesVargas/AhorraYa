import { View } from 'react-native';

import { BarraProgreso, Boton, Icono, Separador, Texto } from '@/components/ui';
import { porcentaje, type Centavos } from '@/lib/dinero';
import { formatMoneda, formatMonedaEntera } from '@/lib/format';

export interface TarjetaAhorroProps {
  /** Lo que hay en las cuentas de ahorro, intereses incluidos. */
  saldo: Centavos;
  delMes: Centavos;
  /** Lo que se sacó del ahorro este mes: la cifra a vigilar. */
  retirosDelMes: Centavos;
  metaMensual: Centavos;
  proyeccionAnual: Centavos;
  /** Sin cuenta de ahorro no hay a dónde aportar: los botones no aparecen. */
  alAportar?: () => void;
  alRetirar?: () => void;
}

/**
 * El ahorro frente a la meta: cuánto llevo este mes y a dónde llego en un año. */
export function TarjetaAhorro({
  delMes,
  retirosDelMes,
  metaMensual,
  proyeccionAnual,
  alAportar,
  alRetirar,
}: TarjetaAhorroProps) {
  const cumplida = delMes >= metaMensual && metaMensual > 0;

  return (
    <View>
      <View className="mb-2 flex-row items-baseline justify-between">
        <Texto variante="detalle" tono="suave">
          {cumplida ? 'Meta del mes cumplida' : 'Este mes'}
        </Texto>
        <Texto variante="detalle" tono={cumplida ? 'primario' : 'normal'} numerico>
          {formatMoneda(delMes)} / {formatMonedaEntera(metaMensual)}
        </Texto>
      </View>
      <BarraProgreso
        valor={porcentaje(Math.max(0, delMes), metaMensual)}
        etiqueta="Avance de la meta del mes"
      />

      {retirosDelMes > 0 ? (
        <View className="mt-3 flex-row items-center gap-2">
          <Icono nombre="alert-circle-outline" tamano={16} color="texto-suave" />
          <Texto variante="detalle" tono="suave" numerico className="flex-1">
            Este mes sacaste {formatMoneda(retirosDelMes)} del ahorro.
          </Texto>
        </View>
      ) : null}

      <View className="my-4">
        <Separador />
      </View>
      <View className="flex-row items-baseline justify-between">
        <Texto variante="detalle" tono="suave">
          En 12 meses, si cumples
        </Texto>
        <Texto variante="cuerpo" peso="semibold" numerico>
          {formatMonedaEntera(proyeccionAnual)}
        </Texto>
      </View>

      {alAportar && alRetirar ? (
        <View className="mt-4 flex-row gap-3">
          <Boton
            texto="Aportar"
            icono="add"
            variante="contorno"
            className="flex-1"
            onPress={alAportar}
          />
          <Boton
            texto="Retirar"
            icono="remove"
            variante="contorno"
            className="flex-1"
            onPress={alRetirar}
          />
        </View>
      ) : null}
    </View>
  );
}
