import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Texto } from '@/components/ui';
import { formatMoneda } from '@/lib/format';
import { FilaCuenta } from '@/modules/cuentas/components/fila-cuenta';
import type { SaldoCuenta } from '@/modules/cuentas/utils/saldos';
import type { NuevoGasto } from '@/modules/gastos/gastos.types';

export interface ElegirCuentaEnlaceProps {
  gasto: NuevoGasto;
  /** Nombre de la categoría, para recordar qué se está registrando. */
  categoria: string;
  saldos: readonly SaldoCuenta[];
  alElegir: (cuentaId: number) => void;
  alCancelar: () => void;
}

/**
 * La pregunta que hace la app cuando el atajo llega con un pago por débito o
 * transferencia: "¿De qué cuenta sale?". Lista las cuentas REGISTRADAS con su
 * saldo, así que una cuenta nueva aparece sin tocar el atajo del iPhone.
 */
export function ElegirCuentaEnlace({
  gasto,
  categoria,
  saldos,
  alElegir,
  alCancelar,
}: ElegirCuentaEnlaceProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancelar"
        onPress={alCancelar}
        className="absolute inset-0 bg-black/50"
      />
      <View
        className="rounded-t-3xl bg-superficie pt-5"
        style={{ paddingBottom: Math.max(bottom, 16) }}
      >
        <View className="gap-1 px-5 pb-3">
          <Texto variante="titulo" peso="bold">
            ¿De qué cuenta sale?
          </Texto>
          <Texto tono="suave">
            {formatMoneda(gasto.montoCentavos)} · {categoria}
          </Texto>
        </View>
        {saldos.map((saldo) => (
          <FilaCuenta
            key={saldo.cuenta.id}
            saldo={saldo}
            alPulsar={() => alElegir(saldo.cuenta.id)}
          />
        ))}
      </View>
    </View>
  );
}
