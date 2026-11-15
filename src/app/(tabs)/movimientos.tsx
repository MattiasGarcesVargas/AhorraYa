import { useState } from 'react';
import { ScrollView, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstadoVacio } from '@/components/estado-vacio';
import { SelectorPeriodo } from '@/components/selector-periodo';
import { Boton, BotonIcono, Chip, Separador, Texto } from '@/components/ui';
import { ESPACIO_FINAL_PESTANAS, MARGEN_PANTALLA } from '@/constants/layout.constants';
import { formatMoneda } from '@/lib/format';
import { formatMesAnio } from '@/lib/fechas';
import { FilaMovimiento } from '@/modules/movimientos/components/fila-movimiento';
import {
  useAbrirMovimiento,
  useEliminarMovimiento,
  useMovimientos,
} from '@/modules/movimientos/hooks/use-movimientos';
import type { FiltroMovimientos } from '@/modules/movimientos/movimientos.types';
import { usePeriodoNavegable } from '@/modules/resumen/hooks/use-periodo-navegable';

const FILTROS: { id: FiltroMovimientos; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'gasto', texto: 'Gastos' },
  { id: 'ingreso', texto: 'Ingresos' },
  { id: 'ahorro', texto: 'Cuentas' },
];

export default function MovimientosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<FiltroMovimientos>('todos');
  const { periodo, esActual, desplazar } = usePeriodoNavegable('mes');
  const { grupos, cargando } = useMovimientos(periodo, filtro);
  const eliminar = useEliminarMovimiento();
  const abrir = useAbrirMovimiento();

  const cabecera = (
    <View>
      <View className="mb-4 flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Texto variante="detalle" tono="suave" className="mb-0.5">
            {formatMesAnio(periodo.inicio).replace(/^./, (c) => c.toUpperCase())}
          </Texto>
          <Texto variante="titulo" accessibilityRole="header">
            Movimientos
          </Texto>
        </View>
        <BotonIcono
          icono="trending-up"
          etiqueta="Registrar ingreso"
          onPress={() => router.push('/nuevo-ingreso')}
        />
        <BotonIcono
          icono="add"
          etiqueta="Registrar gasto"
          variante="primario"
          onPress={() => router.push('/nuevo-gasto')}
        />
      </View>

      <SelectorPeriodo periodo={periodo} esActual={esActual} alDesplazar={desplazar} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 py-3"
      >
        {FILTROS.map(({ id, texto }) => (
          <Chip key={id} texto={texto} seleccionado={filtro === id} onPress={() => setFiltro(id)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SectionList
      className="flex-1 bg-fondo"
      sections={grupos}
      keyExtractor={(movimiento) => movimiento.clave}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + ESPACIO_FINAL_PESTANAS,
        paddingHorizontal: MARGEN_PANTALLA,
      }}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={
        cargando ? undefined : (
          <EstadoVacio
            icono="receipt-outline"
            titulo="Nada por aquí"
            mensaje={
              filtro === 'todos'
                ? 'Lo que registres este mes aparecerá aquí, agrupado por día.'
                : 'No hay movimientos de este tipo en el mes.'
            }
          />
        )
      }
      renderSectionHeader={({ section }) => (
        <View className="mt-5 flex-row items-baseline justify-between pb-1">
          <Texto variante="detalle" peso="bold">
            {section.titulo}
          </Texto>
          {section.gastadoDelDia > 0 ? (
            <Texto variante="detalle" tono="suave" numerico>
              Gastado {formatMoneda(section.gastadoDelDia)}
            </Texto>
          ) : null}
        </View>
      )}
      renderItem={({ item }) => (
        <FilaMovimiento movimiento={item} alPulsar={abrir} alMantener={eliminar} />
      )}
      ItemSeparatorComponent={() => <Separador sangria={52} />}
      ListFooterComponent={
        <View className="mt-6 gap-4">
          <Boton
            texto="Estado de cuenta de este mes"
            icono="document-text-outline"
            variante="secundario"
            ancho
            onPress={() =>
              router.push({
                pathname: '/estado-cuenta',
                params: { mes: periodo.inicio.slice(0, 7) },
              })
            }
          />
          {grupos.length > 0 ? (
            <Texto variante="mini" tono="suave" className="text-center">
              Toca un movimiento para corregirlo; mantenlo presionado para eliminarlo.
            </Texto>
          ) : null}
        </View>
      }
    />
  );
}
