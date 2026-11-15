import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Boton, Superficie, Texto } from '@/components/ui';
import { useCuentas, useMovimientosCuenta } from '@/modules/cuentas/hooks/use-cuentas';

/**
 * Pendiente del plan: "escribir cuánto tengo hoy". Sin ese punto de partida el
 * saldo de una cuenta empieza en cero y miente. Hay un botón por cada cuenta
 * que todavía no tiene ningún movimiento; desaparece cuando todas lo tienen.
 */
export function PuntoDePartida() {
  const router = useRouter();
  const cuentas = useCuentas().data;
  const movimientos = useMovimientosCuenta().data;

  if (!cuentas || !movimientos) return null;

  const conMovimientos = new Set(movimientos.map((movimiento) => movimiento.cuentaId));
  const pendientes = cuentas.filter((cuenta) => !conMovimientos.has(cuenta.id));
  if (pendientes.length === 0) return null;

  return (
    <Superficie variante="acento" relleno="lg">
      <Texto peso="semibold" tono="acento">
        ¿Cuánto tienes hoy en tus cuentas?
      </Texto>
      <Texto variante="detalle" tono="acento" className="mt-1">
        Anota el saldo que ves en el banco para que tus totales sean reales desde el primer día.
      </Texto>
      <View className="mt-4 flex-row flex-wrap gap-2">
        {pendientes.map((cuenta) => (
          <Boton
            key={cuenta.id}
            texto={cuenta.nombre}
            icono="add"
            variante="contorno"
            tamano="sm"
            onPress={() =>
              router.push({
                pathname: '/movimiento-cuenta',
                params: { tipo: 'inicial', cuenta: String(cuenta.id) },
              })
            }
          />
        ))}
      </View>
    </Superficie>
  );
}
