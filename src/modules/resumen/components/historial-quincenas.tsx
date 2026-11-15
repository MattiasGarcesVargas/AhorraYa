import { View } from 'react-native';

import { Icono, Separador, Texto } from '@/components/ui';
import { formatMoneda } from '@/lib/format';
import { etiquetaPeriodo } from '@/lib/periodos';

import type { FilaQuincena } from '../utils/historial-quincenas';

function Fila({ fila }: { fila: FilaQuincena }) {
  const excedido = fila.gastado > fila.presupuesto;

  return (
    <View
      className="flex-row items-center gap-3 py-3"
      accessible
      accessibilityLabel={`${fila.periodo.tipo === 'mes' ? 'Mes' : 'Quincena'} ${etiquetaPeriodo(
        fila.periodo,
      )}: apartaste ${formatMoneda(fila.ahorrado)} de ${formatMoneda(fila.objetivo)}${
        fila.extra > 0 ? `, más ${formatMoneda(fila.extra)} extra` : ''
      }, gastaste ${formatMoneda(fila.gastado)}.`}
    >
      <Icono
        nombre={
          fila.cumplido
            ? 'checkmark-circle'
            : fila.enCurso
              ? 'ellipse-outline'
              : 'close-circle-outline'
        }
        tamano={22}
        color={fila.cumplido ? 'primario' : 'texto-suave'}
      />
      <View className="flex-1">
        <Texto numerico>
          {etiquetaPeriodo(fila.periodo)}
          {fila.enCurso ? (
            <Texto variante="detalle" tono="primario">
              {'  '}en curso
            </Texto>
          ) : null}
        </Texto>
        <Texto variante="detalle" tono={excedido ? 'peligro' : 'suave'} numerico>
          Gastaste {formatMoneda(fila.gastado)} de {formatMoneda(fila.presupuesto)}
        </Texto>
      </View>
      <View className="items-end">
        <Texto peso="medium" numerico tono={fila.cumplido ? 'primario' : 'normal'}>
          {formatMoneda(fila.ahorrado)}
        </Texto>
        <Texto variante="mini" tono="suave" numerico>
          {fila.extra > 0 ? `ahorrado · + ${formatMoneda(fila.extra)} extra` : 'ahorrado'}
        </Texto>
      </View>
    </View>
  );
}

/** La pestaña "Quincenas" de mi Excel (meses, si cobro una vez al mes): ¿aparté lo que tocaba y me alcanzó lo que quedaba? */
export function HistorialQuincenas({ filas }: { filas: FilaQuincena[] }) {
  return (
    <View>
      {filas.map((fila, i) => (
        <View key={fila.periodo.inicio}>
          {i > 0 ? <Separador sangria={34} /> : null}
          <Fila fila={fila} />
        </View>
      ))}
    </View>
  );
}
