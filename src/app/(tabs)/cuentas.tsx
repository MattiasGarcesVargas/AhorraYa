import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Pantalla } from '@/components/pantalla';
import { Seccion } from '@/components/seccion';
import { BotonIcono, Separador, Superficie, Texto } from '@/components/ui';
import { hoyIso } from '@/lib/fechas';
import { mesQueContiene } from '@/lib/periodos';
import { PuntoDePartida } from '@/modules/ahorro/components/punto-de-partida';
import { TarjetaAhorro } from '@/modules/ahorro/components/tarjeta-ahorro';
import { useMovimientosAhorro } from '@/modules/ahorro/hooks/use-ahorro';
import { ahorroNetoEn, proyeccion, retirosEn } from '@/modules/ahorro/utils/calculos-ahorro';
import { FilaCuenta } from '@/modules/cuentas/components/fila-cuenta';
import { TarjetaPatrimonio } from '@/modules/cuentas/components/tarjeta-patrimonio';
import { useCuentaPrincipal, useSaldosCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { usePlan } from '@/modules/plan/hooks/use-plan';
import { HistorialQuincenas } from '@/modules/resumen/components/historial-quincenas';
import { useHistorialQuincenas } from '@/modules/resumen/hooks/use-resumen';

export default function CuentasScreen() {
  const router = useRouter();
  const { saldos, totales } = useSaldosCuentas();
  const movimientosAhorro = useMovimientosAhorro().data ?? [];
  const cuentaAhorro = useCuentaPrincipal('flexible');
  const plan = usePlan();
  const historial = useHistorialQuincenas(6);

  const mes = mesQueContiene(hoyIso());
  const meta = plan.data?.metaMensualCentavos ?? 0;
  const ahorros = totales?.ahorros ?? 0;

  const mover = (tipo: 'aporte' | 'retiro') =>
    cuentaAhorro
      ? () =>
          router.push({
            pathname: '/movimiento-cuenta',
            params: { tipo, cuenta: String(cuentaAhorro.id) },
          })
      : undefined;

  return (
    <Pantalla
      antetitulo="Tu plata, cuenta por cuenta"
      titulo="Cuentas"
      accion={
        <View className="flex-row gap-2">
          {saldos && saldos.length > 1 ? (
            <BotonIcono
              icono="swap-horizontal"
              etiqueta="Transferir entre mis cuentas"
              onPress={() =>
                router.push({
                  pathname: '/movimiento-cuenta',
                  params: { tipo: 'transferir', cuenta: String(saldos[0].cuenta.id) },
                })
              }
            />
          ) : null}
          <BotonIcono
            icono="add"
            etiqueta="Nueva cuenta"
            variante="primario"
            onPress={() => router.push('/editar-cuenta')}
          />
        </View>
      }
    >
      <View className="gap-3">
        {totales ? (
          <TarjetaPatrimonio totales={totales} />
        ) : (
          <View className="h-[180px] rounded-xl bg-superficie" />
        )}
        <PuntoDePartida />
      </View>

      <Seccion titulo="Mis cuentas">
        {saldos && saldos.length > 0 ? (
          <Superficie relleno="ninguno" className="overflow-hidden">
            {saldos.map((saldo, i) => (
              <View key={saldo.cuenta.id}>
                {i > 0 ? <Separador sangria={68} /> : null}
                <FilaCuenta
                  saldo={saldo}
                  alPulsar={() =>
                    router.push({
                      pathname: '/cuenta/[id]',
                      params: { id: String(saldo.cuenta.id) },
                    })
                  }
                />
              </View>
            ))}
          </Superficie>
        ) : (
          <Texto variante="detalle" tono="suave">
            Crea tu primera cuenta con el botón + de arriba.
          </Texto>
        )}
      </Seccion>

      <Seccion titulo="Meta de ahorro">
        <TarjetaAhorro
          saldo={ahorros}
          delMes={ahorroNetoEn(movimientosAhorro, mes)}
          retirosDelMes={retirosEn(movimientosAhorro, mes)}
          metaMensual={meta}
          proyeccionAnual={proyeccion(ahorros, meta)}
          alAportar={mover('aporte')}
          alRetirar={mover('retiro')}
        />
      </Seccion>

      {historial.filas ? (
        <Seccion titulo={historial.tipo === 'mes' ? 'Meses' : 'Quincenas'}>
          <HistorialQuincenas filas={historial.filas} />
        </Seccion>
      ) : null}

      <Superficie variante="contorno" className="mt-8 gap-1">
        <Texto variante="detalle" peso="bold">
          Tus reglas
        </Texto>
        <Texto variante="detalle" tono="suave">
          Apenas cobras, una parte va a la flexible y con el resto vives hasta el siguiente pago.
          Todo ingreso extra va completo al ahorro: suma a tu meta del mes, no reemplaza el aporte
          de tu cobro. Si te pasas en una categoría, compensa en otra: el ahorro no se toca.
        </Texto>
      </Superficie>
    </Pantalla>
  );
}
