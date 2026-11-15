import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { useUltimoDato } from '@/hooks/use-ultimo-dato';
import { hapticos } from '@/lib/hapticos';
import { useCuentas } from '@/modules/cuentas/hooks/use-cuentas';
import { HojaEditarIngreso, HojaNuevoIngreso } from '@/modules/ingresos/components/hojas-ingreso';
import { useIngreso } from '@/modules/ingresos/hooks/use-ingresos';
import { usePlan } from '@/modules/plan/hooks/use-plan';

/** `/nuevo-ingreso` registra uno; `/nuevo-ingreso?id=…` corrige (o elimina) uno ya registrado. */
export default function NuevoIngresoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const cuentas = useCuentas().data;
  const plan = usePlan().data;
  const consulta = useIngreso(id ? Number(id) : undefined);
  // Se recuerda el ingreso: al eliminarlo la consulta queda vacía antes de cerrar la hoja.
  const ingreso = useUltimoDato(consulta.data);

  const terminar = () => {
    hapticos.exito();
    if (router.canGoBack()) router.back();
    else router.replace('/movimientos');
  };

  if (!cuentas || !plan) return null;

  if (id) {
    if (!ingreso) return consulta.isPending ? null : <Redirect href="/movimientos" />;
    return (
      <HojaEditarIngreso
        key={ingreso.id}
        ingreso={ingreso}
        cuentas={cuentas}
        alTerminar={terminar}
      />
    );
  }
  return <HojaNuevoIngreso cuentas={cuentas} plan={plan} alTerminar={terminar} />;
}
