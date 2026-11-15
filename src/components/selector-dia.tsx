import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { inicioDeMes, moverMes, semanasDelMes } from '@/lib/calendario';
import {
  formatDiaRelativo,
  formatMesAnio,
  hoyIso,
  sumarDias,
  type FechaIso,
} from '@/lib/fechas';
import { hapticos } from '@/lib/hapticos';

import { BotonIcono, Icono, Texto } from './ui';

export interface SelectorDiaProps {
  valor: FechaIso;
  alCambiar: (fecha: FechaIso) => void;
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Elegir el día de un registro. Las flechas mueven de a un día (lo normal:
 * "fue ayer"); tocar la fecha abre el calendario del mes para saltar a
 * cualquier día. No deja pasar de hoy: nada se registra en el futuro.
 */
export function SelectorDia({ valor, alCambiar }: SelectorDiaProps) {
  const hoy = hoyIso();
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => inicioDeMes(valor));

  const mover = (dias: number) => {
    hapticos.seleccion();
    const nueva = sumarDias(valor, dias);
    alCambiar(nueva);
    setMes(inicioDeMes(nueva));
  };
  const alternar = () => {
    hapticos.seleccion();
    setMes(inicioDeMes(valor));
    setAbierto((estaba) => !estaba);
  };
  const elegir = (fecha: FechaIso) => {
    hapticos.seleccion();
    alCambiar(fecha);
    setAbierto(false);
  };

  const mesActual = inicioDeMes(hoy);

  return (
    <View className="rounded-lg border border-borde">
      <View className="h-12 flex-row items-center justify-between px-1">
        <BotonIcono
          icono="chevron-back"
          etiqueta="Día anterior"
          variante="fantasma"
          onPress={() => mover(-1)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatDiaRelativo(valor, hoy)}. Elegir otro día en el calendario`}
          accessibilityState={{ expanded: abierto }}
          onPress={alternar}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 active:opacity-70"
        >
          <Icono nombre="calendar-outline" tamano={16} color="texto-suave" />
          <Texto peso="medium" accessibilityLiveRegion="polite">
            {formatDiaRelativo(valor, hoy)}
          </Texto>
        </Pressable>
        <BotonIcono
          icono="chevron-forward"
          etiqueta="Día siguiente"
          variante="fantasma"
          disabled={valor >= hoy}
          className={valor >= hoy ? 'opacity-30' : undefined}
          onPress={() => mover(1)}
        />
      </View>

      {abierto ? (
        <View className="border-t border-borde px-2 pb-2 pt-1">
          <View className="flex-row items-center justify-between">
            <BotonIcono
              icono="chevron-back"
              etiqueta="Mes anterior"
              variante="fantasma"
              onPress={() => setMes(moverMes(mes, -1))}
            />
            <Texto variante="detalle" peso="semibold" className="capitalize">
              {formatMesAnio(mes)}
            </Texto>
            <BotonIcono
              icono="chevron-forward"
              etiqueta="Mes siguiente"
              variante="fantasma"
              disabled={mes >= mesActual}
              className={mes >= mesActual ? 'opacity-30' : undefined}
              onPress={() => setMes(moverMes(mes, 1))}
            />
          </View>

          <View className="flex-row">
            {DIAS_SEMANA.map((dia, i) => (
              <View key={i} className="flex-1 items-center py-1">
                <Texto variante="mini" tono="suave">
                  {dia}
                </Texto>
              </View>
            ))}
          </View>

          {semanasDelMes(mes).map((semana, i) => (
            <View key={i} className="flex-row">
              {semana.map((fecha, j) => {
                if (!fecha) return <View key={j} className="h-11 flex-1" />;
                const elegido = fecha === valor;
                const futuro = fecha > hoy;
                return (
                  <Pressable
                    key={fecha}
                    accessibilityRole="button"
                    accessibilityLabel={formatDiaRelativo(fecha, hoy)}
                    accessibilityState={{ selected: elegido, disabled: futuro }}
                    disabled={futuro}
                    onPress={() => elegir(fecha)}
                    className="h-11 flex-1 items-center justify-center"
                  >
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full ${
                        elegido ? 'bg-seleccion' : fecha === hoy ? 'border border-borde' : ''
                      } ${futuro ? 'opacity-30' : ''}`}
                    >
                      <Texto
                        variante="detalle"
                        peso={elegido ? 'bold' : 'regular'}
                        tono={elegido ? 'seleccion' : 'normal'}
                        numerico
                      >
                        {Number(fecha.slice(8))}
                      </Texto>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
