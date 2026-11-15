import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositorios } from '@/providers/repositorios-context';

import type { CambiosPlan } from '../plan.types';
import { validarCambiosPlan } from '../utils/validar-plan';

export const CLAVE_PLAN = ['plan'] as const;

export function usePlan() {
  const { plan } = useRepositorios();
  return useQuery({ queryKey: CLAVE_PLAN, queryFn: () => plan.obtener() });
}

/** Guarda uno o varios campos del plan, sólo si el plan que resulta es coherente. */
export function useActualizarPlan() {
  const { plan } = useRepositorios();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cambios: CambiosPlan) => {
      const resultado = validarCambiosPlan(await plan.obtener(), cambios);
      if (!resultado.ok) throw new Error(resultado.motivo);
      await plan.actualizar(cambios);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_PLAN }),
  });
}
