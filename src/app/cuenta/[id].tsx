import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Encabezado } from '@/components/encabezado';
import { Seccion } from '@/components/seccion';
import { SelectorPeriodo } from '@/components/selector-periodo';
import { Boton, Monto, Superficie, Texto } from '@/components/ui';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { LibroCuenta } from '@/modules/cuentas/components/libro-cuenta';
import { ResumenInteres } from '@/modules/cuentas/components/resumen-interes';
import { useSaldosCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { useLibroCuenta } from '@/modules/cuentas/hooks/use-libro';
import { subtituloCuenta } from '@/modules/cuentas/utils/textos-cuenta';
import { useAbrirMovimiento } from '@/modules/movimientos/hooks/use-movimientos';
import { usePeriodoNavegable } from '@/modules/resumen/hooks/use-periodo-navegable';

/** Una cuenta por dentro: saldo, interés y su libro de entradas y salidas. */
export default function CuentaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cuentaId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saldos } = useSaldosCuentas();
  const { periodo, esActual, desplazar } = usePeriodoNavegable('mes');
  const libro = useLibroCuenta(cuentaId, periodo);
  const abrir = useAbrirMovimiento();

  if (!saldos) return null;
  const saldo = saldos.find((s) => s.cuenta.id === cuentaId);
  // Sin redirigir: si la cuenta se acaba de eliminar, quien la eliminó ya navega.
  if (!saldo) {
    return (
      <View className="flex-1 bg-fondo">
        <Encabezado titulo="Cuenta" variante="pila" />
        <Texto tono="suave" className="px-5">
          Esta cuenta ya no existe.
        </Texto>
      </View>
    );
  }

  const { cuenta } = saldo;
  const esAhorro = cuenta.tipo === 'flexible';
  const ir = (tipo: 'aporte' | 'retiro' | 'cuadrar' | 'transferir') =>
    router.push({ pathname: '/movimiento-cuenta', params: { tipo, cuenta: String(cuenta.id) } });

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo={cuenta.nombre} variante="pila" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Superficie variante="tinta" relleno="lg">
          <Texto variante="detalle" tono="tinta-suave">
            {subtituloCuenta(cuenta, saldo.tasaBp)}
          </Texto>
          <View className="mb-5 mt-1">
            <Monto centavos={saldo.saldo} tono="tinta" />
          </View>
          <View className="flex-row gap-3">
            <Boton
              texto={esAhorro ? 'Aportar' : 'Depositar'}
              icono="add"
              variante="claro"
              className="flex-1"
              onPress={() => ir('aporte')}
            />
            <Boton
              texto="Retirar"
              icono="remove"
              variante="tinta-contorno"
              className="flex-1"
              onPress={() => ir('retiro')}
            />
          </View>
        </Superficie>

        <View className="mt-4 flex-row gap-2">
          {saldos.length > 1 ? (
            <Boton
              texto="Transferir"
              icono="swap-horizontal"
              variante="contorno"
              className="flex-1"
              onPress={() => ir('transferir')}
            />
          ) : null}
          <Boton
            texto="Cuadrar"
            icono="checkmark-done-outline"
            variante="contorno"
            className="flex-1"
            onPress={() => ir('cuadrar')}
          />
          <Boton
            texto="Editar"
            icono="create-outline"
            variante="contorno"
            className="flex-1"
            onPress={() =>
              router.push({ pathname: '/editar-cuenta', params: { id: String(cuenta.id) } })
            }
          />
        </View>

        {saldo.tasaBp > 0 ? (
          <Seccion titulo="Interés">
            <ResumenInteres saldo={saldo} />
          </Seccion>
        ) : null}

        <Seccion titulo="Debe y haber">
          <View className="mb-3">
            <SelectorPeriodo periodo={periodo} esActual={esActual} alDesplazar={desplazar} />
          </View>
          {libro ? (
            <LibroCuenta
              libro={libro}
              alAbrir={(origen) =>
                abrir({
                  tipo: origen.tipo === 'movimiento' ? 'ahorro' : origen.tipo,
                  id: origen.id,
                })
              }
            />
          ) : null}
          <Texto variante="mini" tono="suave" className="mt-3 text-center">
            Toca una línea para corregirla.
          </Texto>
        </Seccion>
      </ScrollView>
    </View>
  );
}
