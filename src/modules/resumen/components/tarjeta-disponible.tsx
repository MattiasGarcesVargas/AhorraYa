import { View } from 'react-native';

import { BarraProgreso, Monto, Separador, Superficie, Texto } from '@/components/ui';
import { formatMoneda } from '@/lib/format';
import type { TipoPeriodo } from '@/lib/periodos';

import type { Resumen } from '../utils/calcular-resumen';

export interface TarjetaDisponibleProps {
  resumen: Resumen;
  tipo: TipoPeriodo;
}

/**
 * La tarjeta protagonista: cuánto me queda. Es la única superficie negra del
 * inicio, para que el ojo caiga aquí primero.
 */
export function TarjetaDisponible({ resumen, tipo }: TarjetaDisponibleProps) {
  const {
    disponible,
    gastado,
    presupuesto,
    porcentajeUsado,
    diasRestantes,
    porDia,
    esPeriodoActual,
  } = resumen;
  const excedido = disponible < 0;
  const nombrePeriodo = tipo === 'quincena' ? 'esta quincena' : 'este mes';

  const etiqueta = excedido
    ? `Te pasaste ${esPeriodoActual ? nombrePeriodo : ''}`.trim()
    : esPeriodoActual
      ? `Disponible ${nombrePeriodo}`
      : 'Te sobró';

  return (
    <Superficie variante="tinta" relleno="lg">
      <Texto variante="detalle" tono="tinta-suave">
        {etiqueta}
      </Texto>
      <View className="mb-4 mt-1">
        <Monto centavos={Math.abs(disponible)} tono={excedido ? 'peligro' : 'tinta'} />
      </View>

      <BarraProgreso
        valor={porcentajeUsado}
        tono={excedido ? 'peligro' : 'menta'}
        sobre="tinta"
        etiqueta={`Usado ${Math.round(porcentajeUsado)} % del presupuesto`}
      />
      <View className="mt-2 flex-row justify-between">
        <Texto variante="detalle" tono="tinta-suave" numerico>
          {formatMoneda(gastado)} de {formatMoneda(presupuesto)}
        </Texto>
        {esPeriodoActual ? (
          <Texto variante="detalle" tono="tinta-suave" numerico>
            {diasRestantes === 1 ? 'Último día' : `${diasRestantes} días`}
          </Texto>
        ) : null}
      </View>

      {esPeriodoActual ? (
        <>
          <View className="my-4">
            <Separador tinta />
          </View>
          <View className="flex-row items-baseline justify-between">
            <Texto variante="detalle" tono="tinta-suave">
              {excedido ? 'Compénsalo en otra categoría' : 'Puedes gastar al día'}
            </Texto>
            {excedido ? null : (
              <Texto variante="subtitulo" tono="menta" numerico>
                {formatMoneda(porDia)}
              </Texto>
            )}
          </View>
        </>
      ) : null}
    </Superficie>
  );
}
