import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AnilloProgreso, Icono, Monto, Texto } from '@/components/ui';
import { porcentaje } from '@/lib/dinero';
import { hoyIso } from '@/lib/fechas';
import { formatMoneda, formatMonedaEntera, formatPorcentaje } from '@/lib/format';
import { mesQueContiene } from '@/lib/periodos';
import { useSaldosCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { usePlan } from '@/modules/plan/hooks/use-plan';

import { useMovimientosAhorro } from '../hooks/use-ahorro';
import { ahorroNetoEn } from '../utils/calculos-ahorro';

/**
 * Resumen de mi plata para el inicio: lo ahorrado (con su interés), lo que hay
 * para gastar y el avance de la meta del mes. Lleva a la pestaña Cuentas.
 */
export function ResumenAhorro() {
  const router = useRouter();
  const movimientos = useMovimientosAhorro();
  const plan = usePlan();
  const { totales } = useSaldosCuentas();

  if (!movimientos.data || !plan.data || !totales) return null;

  const saldo = totales.ahorros;
  const delMes = ahorroNetoEn(movimientos.data, mesQueContiene(hoyIso()));
  const meta = plan.data.metaMensualCentavos;
  const avance = porcentaje(Math.max(0, delMes), meta);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ahorro total ${formatMoneda(saldo)}. Este mes ${formatMoneda(delMes)} de ${formatMoneda(meta)}.`}
      onPress={() => router.navigate('/cuentas')}
      className="active:opacity-80"
    >
      <View className="min-h-16 flex-row items-center gap-4">
        <AnilloProgreso
          valor={avance}
          tamano={60}
          grosor={6}
          color="primario"
          pista="superficie-alta"
        >
          <Texto variante="mini" peso="semibold" numerico>
            {formatPorcentaje(Math.min(avance, 999))}
          </Texto>
        </AnilloProgreso>
        <View className="flex-1">
          <Texto variante="detalle" tono="suave">
            Ahorro total
          </Texto>
          <Monto centavos={saldo} tamano="md" />
          <Texto variante="mini" tono="suave" numerico className="mt-0.5">
            Este mes {formatMoneda(delMes)} de {formatMonedaEntera(meta)}
          </Texto>
          <Texto variante="mini" tono="suave" numerico className="mt-0.5">
            Para gastar {formatMoneda(totales.disponible)}
            {totales.interesDiario > 0 ? ` · +${formatMoneda(totales.interesDiario)} al día` : ''}
          </Texto>
        </View>
        <Icono nombre="chevron-forward" tamano={18} color="texto-suave" />
      </View>
    </Pressable>
  );
}
