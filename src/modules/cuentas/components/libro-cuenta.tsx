import { Pressable, View } from 'react-native';

import { Separador, Texto } from '@/components/ui';
import { formatDiaMes } from '@/lib/fechas';
import { formatMoneda, formatMonedaConSigno } from '@/lib/format';

import type { Libro, LineaLibro, OrigenLinea } from '../utils/libro';

export interface LibroCuentaProps {
  libro: Libro;
  /** Tocar una línea la abre para corregirla (las de interés no se tocan). */
  alAbrir: (origen: OrigenLinea) => void;
}

function Total({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="flex-1">
      <Texto variante="mini" tono="suave">
        {etiqueta}
      </Texto>
      <Texto variante="detalle" peso="semibold" numerico>
        {valor}
      </Texto>
    </View>
  );
}

function Linea({ linea, alAbrir }: { linea: LineaLibro; alAbrir: LibroCuentaProps['alAbrir'] }) {
  const origen = linea.origen;
  const importe = linea.entra > 0 ? linea.entra : -linea.sale;

  return (
    <Pressable
      accessibilityRole={origen ? 'button' : undefined}
      accessibilityHint={origen ? 'Toca para editar' : undefined}
      disabled={!origen}
      onPress={origen ? () => alAbrir(origen) : undefined}
      className="min-h-12 flex-row items-center gap-3 py-2.5 active:bg-superficie-alta"
    >
      <Texto variante="mini" tono="suave" numerico className="w-11">
        {formatDiaMes(linea.fecha)}
      </Texto>
      <View className="flex-1">
        <Texto variante="detalle" numberOfLines={1}>
          {linea.concepto}
        </Texto>
        {linea.detalle ? (
          <Texto variante="mini" tono="suave" numberOfLines={1}>
            {linea.detalle}
          </Texto>
        ) : null}
      </View>
      <View className="items-end">
        <Texto variante="detalle" peso="medium" numerico tono={importe > 0 ? 'primario' : 'normal'}>
          {formatMonedaConSigno(importe)}
        </Texto>
        <Texto variante="mini" tono="suave" numerico>
          {formatMoneda(linea.saldo)}
        </Texto>
      </View>
    </Pressable>
  );
}

/**
 * El "debe y haber" de una cuenta: lo que entró, lo que salió y el saldo que
 * dejó cada línea, del más antiguo al más reciente (como un extracto).
 */
export function LibroCuenta({ libro, alAbrir }: LibroCuentaProps) {
  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <Total etiqueta="Entró" valor={formatMonedaConSigno(libro.totalEntra)} />
        <Total etiqueta="Salió" valor={formatMonedaConSigno(-libro.totalSale)} />
        <Total etiqueta="Saldo al cierre" valor={formatMoneda(libro.saldoAlCierre)} />
      </View>
      <Separador />

      <View>
        <View className="min-h-11 flex-row items-center justify-between py-2.5">
          <Texto variante="detalle" tono="suave">
            Saldo al inicio
          </Texto>
          <Texto variante="detalle" tono="suave" numerico>
            {formatMoneda(libro.saldoAlInicio)}
          </Texto>
        </View>
        {libro.lineas.map((linea) => (
          <View key={linea.clave}>
            <Separador />
            <Linea linea={linea} alAbrir={alAbrir} />
          </View>
        ))}
        {libro.lineas.length === 0 ? (
          <>
            <Separador />
            <Texto variante="detalle" tono="suave" className="py-3">
              Sin movimientos en este mes.
            </Texto>
          </>
        ) : null}
      </View>
    </View>
  );
}
