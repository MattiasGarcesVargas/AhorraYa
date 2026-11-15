import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Encabezado } from '@/components/encabezado';
import { SelectorPeriodo } from '@/components/selector-periodo';
import { Boton, Texto } from '@/components/ui';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { esFechaIso, hoyIso } from '@/lib/fechas';
import { hapticos } from '@/lib/hapticos';
import { desplazarPeriodo, mesQueContiene, type Periodo } from '@/lib/periodos';
import { ResumenEstadoCuenta } from '@/modules/estado-cuenta/components/resumen-estado-cuenta';
import {
  useEstadoCuenta,
  useExportarEstadoCuenta,
  type FormatoEstadoCuenta,
} from '@/modules/estado-cuenta/hooks/use-estado-cuenta';

/** `?mes=2026-11` abre ese mes; sin parámetro, el mes en curso. */
function mesInicial(mes: string | undefined): Periodo {
  const actual = mesQueContiene(hoyIso());
  const fecha = `${mes ?? ''}-01`;
  if (!mes || !esFechaIso(fecha)) return actual;
  const pedido = mesQueContiene(fecha);
  return pedido.inicio > actual.inicio ? actual : pedido;
}

export default function EstadoCuentaScreen() {
  const insets = useSafeAreaInsets();
  const { mes } = useLocalSearchParams<{ mes?: string }>();
  const [periodo, setPeriodo] = useState(() => mesInicial(mes));
  const { estado } = useEstadoCuenta(periodo);
  const exportar = useExportarEstadoCuenta();

  const actual = mesQueContiene(hoyIso());
  const esActual = periodo.inicio === actual.inicio;

  const desplazar = (pasos: number) => {
    exportar.reset();
    if (pasos === 0) return setPeriodo(actual);
    const siguiente = desplazarPeriodo(periodo, pasos);
    // No hay estados de cuenta del futuro.
    if (siguiente.inicio <= actual.inicio) setPeriodo(siguiente);
  };

  const descargar = (formato: FormatoEstadoCuenta) => {
    if (!estado) return;
    exportar.mutate({ estado, formato }, { onSuccess: () => hapticos.exito() });
  };
  const exportando = exportar.isPending ? exportar.variables?.formato : undefined;

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo="Estado de cuenta" variante="pila" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Texto tono="suave" className="mb-4 mt-2">
          Tu mes como un estado de cuenta: ingresos, gastos por categoría, todos tus movimientos y
          tu cuenta de ahorro con su saldo.
        </Texto>

        <SelectorPeriodo periodo={periodo} esActual={esActual} alDesplazar={desplazar} />

        <View className="mt-3">
          {estado ? (
            <ResumenEstadoCuenta estado={estado} />
          ) : (
            <View className="h-[260px] rounded-xl bg-superficie" />
          )}
        </View>

        <View className="mt-6 gap-3">
          <Boton
            texto="Descargar PDF"
            icono="document-text-outline"
            tamano="lg"
            ancho
            disabled={!estado || exportar.isPending}
            cargando={exportando === 'pdf'}
            onPress={() => descargar('pdf')}
          />
          <Boton
            texto="Exportar para Excel (CSV)"
            icono="grid-outline"
            variante="secundario"
            tamano="lg"
            ancho
            disabled={!estado || exportar.isPending}
            cargando={exportando === 'csv'}
            onPress={() => descargar('csv')}
          />
          {exportar.isError ? (
            <Texto variante="detalle" tono="peligro" className="text-center">
              {exportar.error instanceof Error
                ? exportar.error.message
                : 'No se pudo generar el archivo.'}
            </Texto>
          ) : (
            <Texto variante="detalle" tono="suave" className="text-center">
              Se abre el menú de compartir: guárdalo en Archivos, mándalo por WhatsApp o ábrelo en
              otra app.
            </Texto>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
