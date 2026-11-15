import { View } from 'react-native';

import { Separador, Superficie, Texto } from '@/components/ui';
import type { Centavos } from '@/lib/dinero';
import { formatMoneda, formatMonedaConSigno } from '@/lib/format';

import type { EstadoCuenta } from '../estado-cuenta.types';

function Dato({ etiqueta, valor, tono }: { etiqueta: string; valor: Centavos; tono?: 'menta' }) {
  return (
    <View className="flex-1">
      <Texto variante="mini" tono="tinta-suave">
        {etiqueta}
      </Texto>
      <Texto variante="subtitulo" tono={tono ?? 'tinta'} numerico className="mt-0.5">
        {formatMoneda(valor)}
      </Texto>
    </View>
  );
}

/** Vista previa en pantalla de lo que llevará el documento. */
export function ResumenEstadoCuenta({ estado }: { estado: EstadoCuenta }) {
  const { totales, meta } = estado;
  const mayor = estado.categorias.find((c) => c.gastado > 0);

  return (
    <View className="gap-3">
      <Superficie variante="tinta" relleno="lg" className="gap-4">
        <View className="flex-row gap-4">
          <Dato etiqueta="Ingresos" valor={totales.ingresos} />
          <Dato etiqueta="Gastos" valor={totales.gastos} />
        </View>
        <View className="flex-row gap-4">
          <Dato etiqueta="Ahorrado" valor={totales.ahorroNeto} tono="menta" />
          <Dato etiqueta="Saldo de ahorro" valor={estado.ahorro.saldoAlCierre} />
        </View>
        <Separador tinta />
        <View className="flex-row items-baseline justify-between">
          <Texto variante="detalle" tono="tinta-suave">
            Resultado del mes
          </Texto>
          <Texto peso="bold" tono={totales.flujoLibre >= 0 ? 'menta' : 'peligro'} numerico>
            {formatMonedaConSigno(totales.flujoLibre)}
          </Texto>
        </View>
      </Superficie>

      <Superficie className="gap-1">
        <Texto variante="detalle" numerico>
          <Texto variante="detalle" peso="bold">
            {estado.movimientos.length}
          </Texto>{' '}
          movimientos · {estado.cantidadGastos} gastos · {formatMoneda(estado.promedioDiario)} al
          día
        </Texto>
        <Texto variante="detalle" tono={meta.cumplida ? 'primario' : 'suave'} numerico>
          {meta.cumplida
            ? `Meta de ahorro cumplida (${formatMoneda(meta.alcanzado)}).`
            : `Meta de ahorro: ${formatMoneda(meta.alcanzado)} de ${formatMoneda(meta.objetivo)}.`}
        </Texto>
        {mayor ? (
          <Texto variante="detalle" tono="suave" numerico>
            Donde más gastaste: {mayor.nombre} ({formatMoneda(mayor.gastado)}).
          </Texto>
        ) : null}
        {estado.enCurso ? (
          <Texto variante="detalle" tono="suave">
            El mes aún no termina: las cifras son hasta hoy.
          </Texto>
        ) : null}
      </Superficie>
    </View>
  );
}
