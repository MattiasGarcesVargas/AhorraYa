import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarCategoria } from '@/components/avatar-categoria';
import { Encabezado } from '@/components/encabezado';
import { Boton, Icono, Separador, Texto } from '@/components/ui';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { formatMoneda, formatMonedaEntera } from '@/lib/format';
import { useCategorias } from '@/modules/categorias/hooks/use-categorias';
import { totalPresupuestoMensual } from '@/modules/categorias/utils/catalogo';
import { limiteEnPeriodo } from '@/modules/plan/utils/calculos-plan';

export default function CategoriasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categorias = [] } = useCategorias();
  const total = totalPresupuestoMensual(categorias);

  const editar = (id?: string) =>
    router.push(id ? { pathname: '/categoria', params: { id } } : '/categoria');

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo="Categorías" variante="pila" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: MARGEN_PANTALLA,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Texto tono="suave" className="mb-4 mt-2">
          En qué se te va el dinero y cuánto te permites gastar al mes en cada cosa. En la vista por
          quincena se usa la mitad.
        </Texto>

        <View>
          {categorias.map((categoria, i) => (
            <View key={categoria.id}>
              {i > 0 ? <Separador sangria={52} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${categoria.nombre}, ${
                  categoria.limiteMensualCentavos
                    ? `${formatMoneda(categoria.limiteMensualCentavos)} al mes`
                    : 'sin tope'
                }. Editar.`}
                onPress={() => editar(categoria.id)}
                className="min-h-14 flex-row items-center gap-3 py-2 active:opacity-70"
              >
                <AvatarCategoria icono={categoria.icono} color={categoria.color} tamano={36} />
                <View className="flex-1">
                  <Texto peso="semibold" numberOfLines={1}>
                    {categoria.nombre}
                  </Texto>
                  <Texto variante="detalle" tono="suave" numerico>
                    {categoria.limiteMensualCentavos
                      ? `${formatMoneda(limiteEnPeriodo(categoria.limiteMensualCentavos, 'quincena'))} por quincena`
                      : 'Sin tope'}
                  </Texto>
                </View>
                <Texto numerico>{formatMonedaEntera(categoria.limiteMensualCentavos)}</Texto>
                <Icono nombre="chevron-forward" tamano={16} color="texto-suave" />
              </Pressable>
            </View>
          ))}
        </View>

        <Boton
          texto="Nueva categoría"
          icono="add"
          variante="contorno"
          ancho
          className="mt-4"
          onPress={() => editar()}
        />

        <View className="mt-6 flex-row items-baseline justify-between">
          <Texto peso="semibold">Total al mes</Texto>
          <Texto variante="subtitulo" peso="semibold" numerico>
            {formatMonedaEntera(total)}
          </Texto>
        </View>
        <Texto variante="detalle" tono="suave" className="mt-1 text-right" numerico>
          {formatMoneda(limiteEnPeriodo(total, 'quincena'))} por quincena
        </Texto>
      </ScrollView>
    </View>
  );
}
