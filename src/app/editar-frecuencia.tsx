import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Encabezado } from '@/components/encabezado';
import { Boton, Icono, Separador, Texto } from '@/components/ui';
import { MARGEN_PANTALLA } from '@/constants/layout.constants';
import { formatMonedaEntera } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { useActualizarPlan, usePlan } from '@/modules/plan/hooks/use-plan';
import type { CobrosPorMes, Plan } from '@/modules/plan/plan.types';
import {
  cambiosAlCambiarFrecuencia,
  FRECUENCIAS,
  OPCIONES_FRECUENCIA,
  tipoPeriodoDeCobro,
} from '@/modules/plan/utils/frecuencia';
import { aplicarCambiosPlan, validarCambiosPlan } from '@/modules/plan/utils/validar-plan';
import { useVistaResumen } from '@/modules/resumen/store/vista.store';

/** Qué cambia al pasar a la frecuencia elegida, con las cifras de antes y después. */
function lineasDelCambio(plan: Plan, propuesto: Plan): string[] {
  const mensual = propuesto.cobrosPorMes === 1;
  return [
    mensual
      ? 'El "págate primero" y el historial pasan a medirse por mes, no por quincena.'
      : 'El "págate primero" y el historial pasan a medirse por quincena, de cobro a cobro.',
    `Aporte por cobro: de ${formatMonedaEntera(plan.aporteQuincenalCentavos)} a ${formatMonedaEntera(
      propuesto.aporteQuincenalCentavos,
    )} (tu meta de ${formatMonedaEntera(plan.metaMensualCentavos)} entre ${
      mensual ? '1 cobro' : '2 cobros'
    }).`,
    `Lo que cobras en cada pago: de ${formatMonedaEntera(plan.sueldoQuincenalCentavos)} a ${formatMonedaEntera(
      propuesto.sueldoQuincenalCentavos,
    )}, para que al mes te entre lo mismo.`,
    'Tu meta mensual y tus movimientos no cambian. Puedes corregir cada cifra después.',
  ];
}

export default function EditarFrecuenciaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = usePlan();
  const actualizar = useActualizarPlan();
  const cambiarTipoPeriodo = useVistaResumen((estado) => estado.cambiarTipoPeriodo);
  const [elegida, setElegida] = useState<CobrosPorMes | null>(null);

  if (!plan.data) return null;

  const actual = plan.data;
  const seleccion = elegida ?? actual.cobrosPorMes;
  const hayCambio = seleccion !== actual.cobrosPorMes;
  const cambios = cambiosAlCambiarFrecuencia(actual, seleccion);
  const validacion = validarCambiosPlan(actual, cambios);

  const guardar = () =>
    actualizar.mutate(cambios, {
      onSuccess: () => {
        // El inicio pasa a mostrar el periodo de cobro nuevo.
        cambiarTipoPeriodo(tipoPeriodoDeCobro(seleccion));
        hapticos.exito();
        router.back();
      },
    });

  return (
    <View className="flex-1 bg-fondo">
      <Encabezado titulo="¿Cada cuánto cobras?" variante="hoja" />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: MARGEN_PANTALLA }}>
        <Texto variante="detalle" tono="suave" className="mt-2">
          Tus aportes al ahorro siguen a tus cobros: se te recuerda apartar cada vez que cobras.
        </Texto>

        <View className="mt-2" accessibilityRole="radiogroup">
          {OPCIONES_FRECUENCIA.map((opcion, i) => {
            const activa = seleccion === opcion;
            return (
              <View key={opcion}>
                {i > 0 ? <Separador sangria={34} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activa, checked: activa }}
                  onPress={() => {
                    hapticos.seleccion();
                    setElegida(opcion);
                  }}
                  className="min-h-16 flex-row items-center gap-3 py-3 active:opacity-70"
                >
                  <Icono
                    nombre={activa ? 'radio-button-on' : 'radio-button-off'}
                    tamano={22}
                    color={activa ? 'primario' : 'texto-suave'}
                  />
                  <View className="flex-1">
                    <Texto peso={activa ? 'semibold' : 'medium'}>
                      {FRECUENCIAS[opcion].nombre}
                    </Texto>
                    <Texto variante="detalle" tono="suave">
                      {FRECUENCIAS[opcion].detalle}
                    </Texto>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {hayCambio ? (
          <View className="mt-5 gap-2">
            <Texto variante="detalle" peso="semibold">
              Al cambiar a {FRECUENCIAS[seleccion].nombre.toLowerCase()}
            </Texto>
            {lineasDelCambio(actual, aplicarCambiosPlan(actual, cambios)).map((linea) => (
              <Texto key={linea} variante="detalle" tono="suave" numerico>
                • {linea}
              </Texto>
            ))}
          </View>
        ) : null}

        {!validacion.ok ? (
          <Texto variante="detalle" tono="peligro" className="mt-4" numerico>
            {validacion.motivo} {validacion.sugerencia}
          </Texto>
        ) : null}
      </ScrollView>

      <View
        className="border-t border-borde pt-3"
        style={{ paddingHorizontal: MARGEN_PANTALLA, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Boton
          texto={
            hayCambio
              ? `Cambiar a ${FRECUENCIAS[seleccion].nombre.toLowerCase()}`
              : `Ya cobras ${FRECUENCIAS[seleccion].nombre.toLowerCase()}`
          }
          tamano="lg"
          ancho
          disabled={!hayCambio || !validacion.ok}
          cargando={actualizar.isPending}
          onPress={guardar}
        />
      </View>
    </View>
  );
}
