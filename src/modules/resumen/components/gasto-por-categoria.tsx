import { View } from 'react-native';

import { AvatarCategoria } from '@/components/avatar-categoria';
import { BarraProgreso, Separador, Texto } from '@/components/ui';
import { formatMoneda, formatMonedaEntera } from '@/lib/format';
import { useTema } from '@/providers/tema-provider';

import type { ResumenCategoria } from '../utils/calcular-resumen';

/** Reparto del gasto en una sola barra: de un vistazo, qué categoría se come más. */
function BarraReparto({ categorias }: { categorias: ResumenCategoria[] }) {
  const { colores } = useTema();
  const conGasto = categorias.filter((c) => c.gastado > 0);
  const total = conGasto.reduce((suma, c) => suma + c.gastado, 0);
  if (total === 0) return null;

  return (
    <View
      className="mb-2 h-2 flex-row overflow-hidden rounded-full"
      importantForAccessibility="no-hide-descendants"
    >
      {conGasto.map((c, i) => (
        <View
          key={c.categoria.id}
          style={{
            flex: c.gastado / total,
            backgroundColor: colores[c.categoria.color],
            marginLeft: i === 0 ? 0 : 2,
          }}
        />
      ))}
    </View>
  );
}

function FilaCategoria({ item }: { item: ResumenCategoria }) {
  const { categoria, gastado, limite, restante, porcentaje, excedido, sinTope } = item;
  const estado = sinTope
    ? 'Sin tope'
    : excedido
      ? `+${formatMoneda(-restante)}`
      : `Quedan ${formatMoneda(restante)}`;

  return (
    <View
      className="flex-row items-center gap-3 py-3"
      accessible
      accessibilityLabel={`${categoria.nombre}: ${formatMoneda(gastado)}. ${
        sinTope
          ? 'Sin tope'
          : excedido
            ? `Te pasaste ${formatMoneda(-restante)}`
            : `Quedan ${formatMoneda(restante)}`
      }`}
    >
      <AvatarCategoria icono={categoria.icono} color={categoria.color} tamano={36} />
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-baseline justify-between">
          <Texto>{categoria.nombre}</Texto>
          <Texto variante="detalle" tono={excedido ? 'peligro' : 'suave'} numerico>
            {estado}
          </Texto>
        </View>
        {sinTope ? null : (
          <BarraProgreso
            valor={porcentaje}
            tono={excedido ? 'peligro' : 'primario'}
            grosor="fino"
          />
        )}
        <Texto variante="mini" tono="suave" numerico>
          {sinTope
            ? `${formatMoneda(gastado)} gastado`
            : `${formatMoneda(gastado)} de ${formatMonedaEntera(limite)}`}
        </Texto>
      </View>
    </View>
  );
}

export function GastoPorCategoria({ categorias }: { categorias: ResumenCategoria[] }) {
  const excedidas = categorias.filter((c) => c.excedido);

  return (
    <View className="gap-2">
      <BarraReparto categorias={categorias} />
      <View>
        {categorias.map((item, i) => (
          <View key={item.categoria.id}>
            {i > 0 ? <Separador sangria={48} /> : null}
            <FilaCategoria item={item} />
          </View>
        ))}
      </View>

      {excedidas.length > 0 ? (
        <View className="rounded-lg bg-peligro-suave px-4 py-3">
          <Texto variante="detalle" tono="peligro" peso="semibold">
            Te pasaste en {excedidas.map((c) => c.categoria.nombre).join(', ')}.
          </Texto>
          <Texto variante="detalle" tono="peligro">
            Compénsalo gastando menos en otra categoría. El ahorro no se toca.
          </Texto>
        </View>
      ) : null}
    </View>
  );
}
