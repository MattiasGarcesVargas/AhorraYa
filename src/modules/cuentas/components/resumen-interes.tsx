import { View } from 'react-native';

import { Superficie, Texto } from '@/components/ui';
import { formatMoneda } from '@/lib/format';

import { proyectarInteres } from '../utils/interes';
import type { SaldoCuenta } from '../utils/saldos';

function Dato({ etiqueta, centavos }: { etiqueta: string; centavos: number }) {
  return (
    <View className="grow basis-[47%]">
      <Texto variante="mini" tono="suave">
        {etiqueta}
      </Texto>
      <Texto peso="bold" tono="primario" numerico>
        +{formatMoneda(centavos)}
      </Texto>
    </View>
  );
}

/**
 * Lo que la cuenta ha dado y lo que dará si no se toca. Las proyecciones se
 * recalculan con el saldo de hoy: un retiro las baja en el acto.
 */
export function ResumenInteres({ saldo }: { saldo: SaldoCuenta }) {
  return (
    <Superficie className="gap-3">
      <View className="flex-row flex-wrap gap-x-4 gap-y-3">
        <Dato etiqueta="Hoy" centavos={saldo.interesHoy} />
        <Dato etiqueta="Este mes" centavos={saldo.interesMes} />
        <Dato
          etiqueta="Próximos 30 días"
          centavos={proyectarInteres(saldo.saldo, saldo.tasaBp, 30)}
        />
        <Dato etiqueta="En un año" centavos={proyectarInteres(saldo.saldo, saldo.tasaBp, 365)} />
      </View>
      <Texto variante="mini" tono="suave" numerico>
        Es un estimado: saldo × tasa anual ÷ 365, sumado cada día. Mañana serían unos{' '}
        {formatMoneda(saldo.interesDiario)}. Si no coincide con el banco, usa &quot;Cuadrar&quot;.
      </Texto>
    </Superficie>
  );
}
