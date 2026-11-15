import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { EstadoVacio } from '@/components/estado-vacio';
import { Pantalla } from '@/components/pantalla';
import { Seccion } from '@/components/seccion';
import { SelectorPeriodo } from '@/components/selector-periodo';
import { Boton, Separador, Superficie } from '@/components/ui';
import { formatFechaLarga, hoyIso } from '@/lib/fechas';
import { PuntoDePartida } from '@/modules/ahorro/components/punto-de-partida';
import { ResumenAhorro } from '@/modules/ahorro/components/resumen-ahorro';
import { useCatalogoCategorias } from '@/modules/categorias/hooks/use-categorias';
import { FilaMovimiento } from '@/modules/movimientos/components/fila-movimiento';
import {
  useAbrirMovimiento,
  useEliminarMovimiento,
} from '@/modules/movimientos/hooks/use-movimientos';
import { desdeGasto } from '@/modules/movimientos/utils/movimientos.utils';
import { GastoPorCategoria } from '@/modules/resumen/components/gasto-por-categoria';
import { PagatePrimero } from '@/modules/resumen/components/pagate-primero';
import { TarjetaDisponible } from '@/modules/resumen/components/tarjeta-disponible';
import { usePeriodoNavegable } from '@/modules/resumen/hooks/use-periodo-navegable';
import { useResumen } from '@/modules/resumen/hooks/use-resumen';
import { useVistaResumen } from '@/modules/resumen/store/vista.store';

export default function InicioScreen() {
  const router = useRouter();
  const tipo = useVistaResumen((estado) => estado.tipoPeriodo);
  const cambiarTipo = useVistaResumen((estado) => estado.cambiarTipoPeriodo);
  const { periodo, esActual, desplazar, reiniciar } = usePeriodoNavegable(tipo);
  const { resumen } = useResumen(periodo);
  const eliminar = useEliminarMovimiento();
  const abrir = useAbrirMovimiento();
  const catalogo = useCatalogoCategorias();

  const nuevoGasto = () => router.push('/nuevo-gasto');

  return (
    <Pantalla antetitulo={formatFechaLarga(hoyIso())} titulo="AhorraYa" conLogo>
      <SelectorPeriodo
        periodo={periodo}
        esActual={esActual}
        alDesplazar={desplazar}
        alCambiarTipo={(nuevo) => {
          cambiarTipo(nuevo);
          reiniciar();
        }}
      />

      <View className="mt-3 gap-3">
        {resumen ? (
          <TarjetaDisponible resumen={resumen} tipo={periodo.tipo} />
        ) : (
          <View className="h-[232px] rounded-xl bg-superficie" />
        )}
        <Boton texto="Registrar gasto" icono="add" tamano="lg" ancho onPress={nuevoGasto} />
        {resumen && esActual && resumen.esPeriodoDeCobro ? (
          <PagatePrimero
            ahorro={resumen.ahorro}
            extra={resumen.ahorroExtra}
            tipoPeriodo={periodo.tipo}
          />
        ) : null}
        <PuntoDePartida />
      </View>

      <Seccion titulo="Tu plata">
        <ResumenAhorro />
      </Seccion>

      {resumen ? (
        <>
          <Seccion
            titulo="Por categoría"
            accion={{ texto: 'Editar', alPulsar: () => router.push('/categorias') }}
          >
            <GastoPorCategoria categorias={resumen.categorias} />
          </Seccion>

          <Seccion
            titulo="Últimos gastos"
            accion={
              resumen.cantidadGastos > 0
                ? { texto: 'Ver todos', alPulsar: () => router.navigate('/movimientos') }
                : undefined
            }
          >
            {resumen.ultimosGastos.length > 0 ? (
              <Superficie relleno="ninguno" className="px-4 py-1">
                {resumen.ultimosGastos.map((gasto, i) => (
                  <View key={gasto.id}>
                    {i > 0 ? <Separador sangria={52} /> : null}
                    <FilaMovimiento
                      movimiento={desdeGasto(gasto, catalogo)}
                      alPulsar={abrir}
                      alMantener={eliminar}
                    />
                  </View>
                ))}
              </Superficie>
            ) : (
              <EstadoVacio
                icono="receipt-outline"
                titulo={
                  esActual ? 'Aún no hay gastos en este periodo' : 'Sin gastos en este periodo'
                }
                mensaje="Regístralos el mismo día, sin juzgarte: el primer mes es para ver en qué se te va el dinero."
                accion={
                  esActual ? { texto: 'Registrar el primero', alPulsar: nuevoGasto } : undefined
                }
              />
            )}
          </Seccion>
        </>
      ) : null}
    </Pantalla>
  );
}
