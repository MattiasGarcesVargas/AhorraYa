import { View } from 'react-native';

import { Monto, Separador, Superficie, Texto } from '@/components/ui';
import { formatMoneda } from '@/lib/format';

import type { TotalesCuentas } from '../utils/saldos';

function Parte({ etiqueta, centavos }: { etiqueta: string; centavos: number }) {
  return (
    <View className="flex-1">
      <Texto variante="mini" tono="tinta-suave">
        {etiqueta}
      </Texto>
      <Texto variante="cuerpo" peso="semibold" tono="tinta" numerico>
        {formatMoneda(centavos)}
      </Texto>
    </View>
  );
}

/** Protagonista de la pestaña Cuentas: todo lo que tengo y cómo se reparte. */
export function TarjetaPatrimonio({ totales }: { totales: TotalesCuentas }) {
  return (
    <Superficie variante="tinta" relleno="lg">
      <Texto variante="detalle" tono="tinta-suave">
        Tengo en total
      </Texto>
      <View className="mb-4 mt-1">
        <Monto centavos={totales.patrimonio} tono="tinta" />
      </View>

      <View className="flex-row gap-4">
        <Parte etiqueta="Ahorrado" centavos={totales.ahorros} />
        <Parte etiqueta="Para gastar" centavos={totales.disponible} />
        {totales.efectivo !== 0 ? (
          <Parte etiqueta="En efectivo" centavos={totales.efectivo} />
        ) : null}
      </View>

      {totales.interesDiario > 0 || totales.interesMes > 0 ? (
        <>
          <View className="my-4">
            <Separador tinta />
          </View>
          <View className="flex-row items-baseline justify-between">
            <Texto variante="detalle" tono="tinta-suave">
              Interés de hoy
            </Texto>
            <Texto variante="detalle" tono="menta" numerico>
              +{formatMoneda(totales.interesHoy)}
            </Texto>
          </View>
          <View className="mt-1 flex-row items-baseline justify-between">
            <Texto variante="detalle" tono="tinta-suave">
              Interés de este mes
            </Texto>
            <Texto variante="detalle" tono="menta" numerico>
              +{formatMoneda(totales.interesMes)}
            </Texto>
          </View>
        </>
      ) : null}
    </Superficie>
  );
}
