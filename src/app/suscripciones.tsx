import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Encabezado } from '@/components/encabezado';
import { Boton, Separador, Texto } from '@/components/ui';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { sumar } from '@/lib/dinero';
import { hoyIso } from '@/lib/fechas';
import { formatMoneda } from '@/lib/format';
import { useCatalogoCategorias } from '@/modules/categorias/hooks/use-categorias';
import { aplicaImpuestos, desglosarExterior } from '@/modules/gastos/utils/impuestos-exterior';
import { FilaSuscripcion } from '@/modules/suscripciones/components/fila-suscripcion';
import { useSuscripciones } from '@/modules/suscripciones/hooks/use-suscripciones';
import type { Suscripcion } from '@/modules/suscripciones/suscripciones.types';
import { proximoCobro } from '@/modules/suscripciones/utils/validar-suscripcion';

export default function SuscripcionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const catalogo = useCatalogoCategorias();
  const { data: suscripciones = [] } = useSuscripciones();
  const hoy = hoyIso();

  /** Lo que el banco descuenta: con impuestos si es una app del exterior con tarjeta. */
  const cobradoDe = (s: Suscripcion) =>
    aplicaImpuestos(catalogo.porId(s.categoria), s.metodoPago)
      ? desglosarExterior(s.montoCentavos).cobrado
      : null;

  const total = sumar(
    suscripciones.filter((s) => s.activa).map((s) => cobradoDe(s) ?? s.montoCentavos),
  );

  const editar = (id?: number) =>
    router.push(id ? { pathname: '/suscripcion', params: { id: String(id) } } : '/suscripcion');

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo="Suscripciones" variante="pila" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Texto tono="suave" className="mb-4 mt-2">
          Cobros que se repiten un día fijo del mes. Ese día se registran solos como gasto al abrir
          la app.
        </Texto>

        {suscripciones.length === 0 ? (
          <View className="items-center py-8">
            <Texto peso="semibold">Aún no tienes suscripciones</Texto>
            <Texto variante="detalle" tono="suave" className="mt-1 text-center">
              Agrega Claude, el almacenamiento de Apple o lo que se cobre cada mes.
            </Texto>
          </View>
        ) : (
          <View>
            {suscripciones.map((s, i) => (
              <View key={s.id}>
                {i > 0 ? <Separador sangria={52} /> : null}
                <FilaSuscripcion
                  suscripcion={s}
                  categoria={catalogo.porId(s.categoria)}
                  proximoCobro={proximoCobro(s.diaCobro, hoy, s.cobradaHasta)}
                  cobradoCentavos={cobradoDe(s)}
                  alPulsar={() => editar(s.id)}
                />
              </View>
            ))}
          </View>
        )}

        <Boton
          texto="Nueva suscripción"
          icono="add"
          variante="contorno"
          ancho
          className="mt-4"
          onPress={() => editar()}
        />

        {suscripciones.length > 0 ? (
          <View className="mt-6 flex-row items-baseline justify-between">
            <Texto peso="semibold">Total al mes</Texto>
            <Texto variante="subtitulo" peso="semibold" numerico>
              {formatMoneda(total)}
            </Texto>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
