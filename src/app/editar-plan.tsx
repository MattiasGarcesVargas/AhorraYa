import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { HojaMonto } from '@/components/hoja-monto';
import { formatMoneda } from '@/lib/format';
import { hapticos } from '@/lib/hapticos';
import { useActualizarPlan, usePlan } from '@/modules/plan/hooks/use-plan';
import { CAMPOS_PLAN, esCampoPlan } from '@/modules/plan/plan.types';
import { validarCambiosPlan } from '@/modules/plan/utils/validar-plan';

export default function EditarPlanScreen() {
  const router = useRouter();
  const { campo } = useLocalSearchParams<{ campo?: string }>();
  const plan = usePlan();
  const actualizar = useActualizarPlan();

  if (!campo || !esCampoPlan(campo)) return <Redirect href="/ajustes" />;
  if (!plan.data) return null;

  const { titulo, descripcion } = CAMPOS_PLAN[campo];
  const planActual = plan.data;
  // Se valida el plan que QUEDARÍA con lo que se está escribiendo.
  const motivoSiNoCuadra = (centavos: number) => {
    const resultado = validarCambiosPlan(planActual, { [campo]: centavos });
    return resultado.ok ? null : resultado.motivo;
  };

  return (
    <HojaMonto
      titulo={titulo}
      descripcion={descripcion(planActual.cobrosPorMes)}
      valorInicial={planActual[campo]}
      permitirCero
      guardando={actualizar.isPending}
      error={motivoSiNoCuadra}
      textoGuardar={(centavos) => `Guardar ${formatMoneda(centavos)}`}
      alGuardar={(valor) =>
        actualizar.mutate(
          { [campo]: valor },
          {
            onSuccess: () => {
              hapticos.exito();
              router.back();
            },
          },
        )
      }
    />
  );
}
