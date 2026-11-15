import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Boton, Icono, Separador, Texto } from '@/components/ui';
import type { Centavos } from '@/lib/dinero';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import type { TipoPeriodo } from '@/lib/periodos';
import { useAportarAlAhorro } from '@/modules/ahorro/hooks/use-ahorro';
import { useCuentaPrincipal } from '@/modules/cuentas/hooks/use-cuentas';

import type { ResumenAhorroPeriodo } from '../utils/calcular-resumen';

export interface PagatePrimeroProps {
  ahorro: ResumenAhorroPeriodo;
  /** Aportes que no salieron del sueldo en este periodo. */
  extra?: Centavos;
  /** El periodo de cobro: quincena, o mes si se cobra una vez al mes. */
  tipoPeriodo?: TipoPeriodo;
}

/**
 * Regla principal del plan: apenas cobro, paso el aporte al ahorro ANTES de
 * gastar. La tarjeta lo recuerda en cada periodo de cobro (quincena o mes) y
 * lo registra en un toque; una vez hecho se reduce a una línea de confirmación.
 * Los aportes extra se muestran aparte: suman a la meta del mes, no a este aporte.
 */
export function PagatePrimero({ ahorro, extra = 0, tipoPeriodo = 'quincena' }: PagatePrimeroProps) {
  const router = useRouter();
  const { aportar: aportarAlAhorro, cargando, disponible } = useAportarAlAhorro();
  const cuentaAhorro = useCuentaPrincipal('flexible');

  // Sin meta o sin cuenta de ahorro no hay nada que recordar.
  if (ahorro.objetivo <= 0 || !disponible) return null;

  const esMes = tipoPeriodo === 'mes';
  const textoExtra = extra > 0 ? ` · + ${formatMoneda(extra)} extra` : '';

  if (ahorro.cumplido) {
    return (
      <View className="flex-row items-center gap-3 py-1">
        <Icono nombre="checkmark-circle" tamano={22} color="primario" />
        <View className="flex-1">
          <Texto peso="semibold">Ya te pagaste primero</Texto>
          <Texto variante="detalle" tono="suave" numerico>
            Apartaste {formatMoneda(ahorro.neto)} {esMes ? 'este mes' : 'esta quincena'}
            {textoExtra}
          </Texto>
        </View>
      </View>
    );
  }

  const aportar = () => aportarAlAhorro(ahorro.falta, 'Págate primero', () => hapticos.exito());

  return (
    <View>
      <Separador />
      <View className="mt-4 flex-row items-center gap-2">
        <Icono nombre="leaf-outline" tamano={18} color="primario" />
        <Texto peso="semibold">Págate primero</Texto>
      </View>
      <Texto variante="detalle" tono="suave" className="mt-1" numerico>
        {ahorro.neto > 0
          ? `Llevas ${formatMoneda(ahorro.neto)}. Te faltan ${formatMoneda(ahorro.falta)} para tu aporte ${esMes ? 'del mes' : 'de la quincena'}.`
          : `Aparta ${formatMoneda(ahorro.objetivo)} al ahorro apenas cobres, antes de gastar nada.`}
      </Texto>
      {extra > 0 ? (
        <Texto variante="detalle" tono="suave" className="mt-1" numerico>
          + {formatMoneda(extra)} extra: suma a tu meta del mes, no a este aporte.
        </Texto>
      ) : null}
      <View className="mt-3 flex-row items-center gap-2">
        <Boton
          texto={`Ya aparté ${formatMoneda(ahorro.falta)}`}
          icono="checkmark"
          variante="secundario"
          tamano="sm"
          cargando={cargando}
          onPress={aportar}
        />
        <Pressable
          accessibilityRole="button"
          className="min-h-11 justify-center px-3"
          hitSlop={6}
          onPress={() =>
            router.push({
              pathname: '/movimiento-cuenta',
              params: { tipo: 'aporte', cuenta: String(cuentaAhorro?.id ?? '') },
            })
          }
        >
          <Texto variante="detalle" peso="medium" tono="primario">
            Otro monto
          </Texto>
        </Pressable>
      </View>
    </View>
  );
}
