import { Pressable, View } from 'react-native';

import { hapticos } from '@/lib/hapticos';
import { etiquetaPeriodo, type Periodo, type TipoPeriodo } from '@/lib/periodos';

import { BotonIcono, Texto } from './ui';

export interface SelectorPeriodoProps {
  periodo: Periodo;
  /** Si se ofrece, aparece el conmutador Quincena / Mes. */
  alCambiarTipo?: (tipo: TipoPeriodo) => void;
  /** -1 anterior, +1 siguiente, 0 volver al actual. */
  alDesplazar: (pasos: number) => void;
  esActual: boolean;
}

const TIPOS: { id: TipoPeriodo; texto: string }[] = [
  { id: 'quincena', texto: 'Quincena' },
  { id: 'mes', texto: 'Mes' },
];

/** Conmutador Quincena/Mes y flechas para recorrer periodos anteriores. */
export function SelectorPeriodo({
  periodo,
  alCambiarTipo,
  alDesplazar,
  esActual,
}: SelectorPeriodoProps) {
  return (
    <View className="flex-row items-center justify-between">
      {alCambiarTipo ? (
        <View className="flex-row rounded-full bg-superficie p-1" accessibilityRole="tablist">
          {TIPOS.map(({ id, texto }) => {
            const activo = periodo.tipo === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
                onPress={() => {
                  hapticos.seleccion();
                  alCambiarTipo(id);
                }}
                className={`h-9 justify-center rounded-full px-4 ${activo ? 'bg-seleccion' : ''}`}
              >
                <Texto variante="detalle" peso="bold" tono={activo ? 'seleccion' : 'suave'}>
                  {texto}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View />
      )}

      <View className="flex-row items-center">
        <BotonIcono
          icono="chevron-back"
          etiqueta="Periodo anterior"
          variante="fantasma"
          onPress={() => alDesplazar(-1)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={esActual ? 'Periodo actual' : 'Volver al periodo actual'}
          disabled={esActual}
          onPress={() => alDesplazar(0)}
        >
          <Texto variante="detalle" peso="bold" numerico className="min-w-[104px] text-center">
            {etiquetaPeriodo(periodo)}
          </Texto>
        </Pressable>
        <BotonIcono
          icono="chevron-forward"
          etiqueta="Periodo siguiente"
          variante="fantasma"
          disabled={esActual}
          className={esActual ? 'opacity-30' : undefined}
          onPress={() => alDesplazar(1)}
        />
      </View>
    </View>
  );
}
